import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { templateStore, stickerStore, collageStore, replacementStore } from '../storage/store';
import {
  CollageTemplate,
  TemplateElement,
  TemplateApplyMode,
  TemplateApplyResult,
  TemplateReplacementRecord,
  Collage,
  CollageElement,
  ColorFamily
} from '../types';
import {
  convertTemplateElementsToCollage,
  generatePlaceholderElements
} from '../utils/templateUtils';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { theme, tag, colorFamily, canvasWidth, canvasHeight, search } = req.query;
    let templates = templateStore.getAll().sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (theme) {
      templates = templates.filter(t => t.themes.includes(theme as string));
    }
    if (tag) {
      templates = templates.filter(t => t.tags.includes(tag as string));
    }
    if (colorFamily) {
      templates = templates.filter(t => t.colorFamilies.includes(colorFamily as ColorFamily));
    }
    if (canvasWidth) {
      templates = templates.filter(t => t.canvasWidth === parseInt(canvasWidth as string));
    }
    if (canvasHeight) {
      templates = templates.filter(t => t.canvasHeight === parseInt(canvasHeight as string));
    }
    if (search) {
      const searchStr = (search as string).toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchStr) ||
        t.description.toLowerCase().includes(searchStr) ||
        t.themes.some(th => th.toLowerCase().includes(searchStr))
      );
    }

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('获取模板列表错误:', error);
    res.status(500).json({ success: false, error: '获取模板列表失败' });
  }
});

router.get('/themes', (req: Request, res: Response) => {
  try {
    const templates = templateStore.getAll();
    const themeSet = new Set<string>();
    for (const t of templates) {
      for (const th of t.themes) {
        themeSet.add(th);
      }
    }
    const stickers = stickerStore.getAll();
    for (const s of stickers) {
      if (s.themes && s.themes.length > 0) {
        for (const th of s.themes) {
          themeSet.add(th);
        }
      }
    }
    res.json({ success: true, data: Array.from(themeSet).sort() });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取主题列表失败' });
  }
});

router.get('/sizes', (req: Request, res: Response) => {
  try {
    const templates = templateStore.getAll();
    const sizeSet = new Set<string>();
    for (const t of templates) {
      sizeSet.add(`${t.canvasWidth}x${t.canvasHeight}`);
    }
    const collages = collageStore.getAll();
    for (const c of collages) {
      sizeSet.add(`${c.canvasWidth}x${c.canvasHeight}`);
    }
    const sizes = Array.from(sizeSet).map(s => {
      const [w, h] = s.split('x').map(Number);
      return { width: w, height: h, label: `${w} × ${h}` };
    });
    res.json({ success: true, data: sizes });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取尺寸列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const template = templateStore.getById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: '模板不存在' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取模板失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, collageId, themes, elements, backgroundColor, canvasWidth, canvasHeight, tags } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: '请输入模板名称' });
    }

    let sourceCollage: Collage | undefined;
    if (collageId) {
      sourceCollage = collageStore.getById(collageId);
      if (!sourceCollage) {
        return res.status(400).json({ success: false, error: '来源作品不存在' });
      }
    }

    const allStickers = stickerStore.getAll();
    const colorFamiliesSet = new Set<ColorFamily>();
    const themesSet = new Set<string>();

    const templateElements: TemplateElement[] = [];

    let sourceElements: CollageElement[] = [];
    let sourceBg = '#FFFFFF';
    let sourceW = 800;
    let sourceH = 1100;
    let sourceTags: string[] = [];

    if (sourceCollage) {
      sourceElements = sourceCollage.elements;
      sourceBg = sourceCollage.backgroundColor;
      sourceW = sourceCollage.canvasWidth;
      sourceH = sourceCollage.canvasHeight;
      sourceTags = sourceCollage.tags;
    }

    if (elements && Array.isArray(elements) && elements.length > 0) {
      sourceElements = elements;
      if (backgroundColor) sourceBg = backgroundColor;
      if (canvasWidth) sourceW = canvasWidth;
      if (canvasHeight) sourceH = canvasHeight;
      if (tags) sourceTags = tags;
    }

    for (const elem of sourceElements) {
      const sticker = allStickers.find(s => s.id === elem.stickerId);
      if (sticker) {
        colorFamiliesSet.add(sticker.colorFamily);
        if (sticker.themes) {
          sticker.themes.forEach(th => themesSet.add(th));
        }
        templateElements.push({
          id: `tpl_${elem.id}_${uuidv4().slice(0, 6)}`,
          originalStickerId: elem.stickerId,
          originalStickerCategory: sticker.category,
          originalStickerColorFamily: sticker.colorFamily,
          x: elem.x,
          y: elem.y,
          width: elem.width,
          height: elem.height,
          rotation: elem.rotation,
          zIndex: elem.zIndex
        });
      }
    }

    let finalThemes: string[] = [];
    if (themes && Array.isArray(themes) && themes.length > 0) {
      finalThemes = themes;
    } else if (themesSet.size > 0) {
      finalThemes = Array.from(themesSet);
    }

    const template: CollageTemplate = {
      id: uuidv4(),
      name,
      description: description || '',
      elements: templateElements,
      backgroundColor: sourceBg,
      canvasWidth: sourceW,
      canvasHeight: sourceH,
      tags: sourceTags,
      themes: finalThemes,
      colorFamilies: Array.from(colorFamiliesSet),
      sourceCollageId: collageId,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const created = templateStore.create(template);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('创建模板错误:', error);
    res.status(500).json({ success: false, error: '创建模板失败' });
  }
});

router.post('/:id/apply', (req: Request, res: Response) => {
  try {
    const { mode } = req.body as { mode: TemplateApplyMode };
    const template = templateStore.getById(req.params.id);

    if (!template) {
      return res.status(404).json({ success: false, error: '模板不存在' });
    }

    const allStickers = stickerStore.getAll();
    let result: TemplateApplyResult;

    if (mode === 'keep_materials') {
      const { elements, replacements } = convertTemplateElementsToCollage(
        template.elements,
        true,
        allStickers
      );
      result = {
        elements,
        backgroundColor: template.backgroundColor,
        canvasWidth: template.canvasWidth,
        canvasHeight: template.canvasHeight,
        replacements
      };
    } else if (mode === 'placeholders_only') {
      result = {
        elements: generatePlaceholderElements(template.elements),
        backgroundColor: template.backgroundColor,
        canvasWidth: template.canvasWidth,
        canvasHeight: template.canvasHeight,
        replacements: []
      };
    } else {
      const { elements, replacements } = convertTemplateElementsToCollage(
        template.elements,
        false,
        allStickers
      );
      result = {
        elements,
        backgroundColor: template.backgroundColor,
        canvasWidth: template.canvasWidth,
        canvasHeight: template.canvasHeight,
        replacements
      };

      const newCollageId = uuidv4();
      const records: TemplateReplacementRecord[] = replacements.map(r => {
        const origSticker = allStickers.find(s => s.id === r.originalStickerId);
        const newSticker = allStickers.find(s => s.id === r.newStickerId);
        return {
          id: uuidv4(),
          templateId: template.id,
          collageId: newCollageId,
          originalStickerId: r.originalStickerId,
          originalStickerCategory: origSticker?.category || 'decoration',
          newStickerId: r.newStickerId,
          newStickerCategory: newSticker?.category || 'decoration',
          createdAt: new Date().toISOString()
        };
      });
      if (records.length > 0) {
        replacementStore.createBatch(records);
      }

      for (const r of replacements) {
        stickerStore.incrementUsage(r.newStickerId);
      }
    }

    templateStore.incrementUsage(template.id);

    res.json({
      success: true,
      data: {
        ...result,
        templateId: template.id,
        templateName: template.name
      }
    });
  } catch (error) {
    console.error('套用模板错误:', error);
    res.status(500).json({ success: false, error: '套用模板失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, description, themes, tags } = req.body;
    const updates: Partial<CollageTemplate> = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (themes !== undefined) updates.themes = themes;
    if (tags !== undefined) updates.tags = tags;

    const updated = templateStore.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: '模板不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新模板失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = templateStore.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '模板不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除模板失败' });
  }
});

export default router;
