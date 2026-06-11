import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { stickerStore } from '../storage/store';
import { Sticker, StickerCategory, StickerSource } from '../types';
import { extractPrimaryColorsFromDataUrl, getDominantColorFamily } from '../utils/colorUtils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req: Request, res: Response) => {
  try {
    const { category, source, theme, tagId, colorFamily, search } = req.query;
    let stickers = stickerStore.getAll();

    if (category) {
      stickers = stickers.filter(s => s.category === category);
    }
    if (source) {
      stickers = stickers.filter(s => s.source === source);
    }
    if (theme) {
      stickers = stickers.filter(s => s.themes.includes(theme as string));
    }
    if (tagId) {
      stickers = stickers.filter(s => s.tagIds.includes(tagId as string));
    }
    if (colorFamily) {
      stickers = stickers.filter(s => s.colorFamily === colorFamily);
    }
    if (search) {
      const searchStr = (search as string).toLowerCase();
      stickers = stickers.filter(s =>
        s.name.toLowerCase().includes(searchStr) ||
        s.themes.some(t => t.toLowerCase().includes(searchStr))
      );
    }

    res.json({ success: true, data: stickers });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取素材列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const sticker = stickerStore.getById(req.params.id);
    if (!sticker) {
      return res.status(404).json({ success: false, error: '素材不存在' });
    }
    res.json({ success: true, data: sticker });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取素材失败' });
  }
});

router.post('/', upload.single('image'), (req: Request, res: Response) => {
  try {
    const { name, category, source, themes, tagIds } = req.body;

    let imageData = '';
    if (req.file) {
      const mimeType = req.file.mimetype || 'image/png';
      imageData = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body.imageData) {
      imageData = req.body.imageData;
    }

    if (!name || !category || !source) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    const primaryColors = imageData ? extractPrimaryColorsFromDataUrl(imageData, 5) : ['#CCCCCC', '#DDDDDD', '#EEEEEE'];
    const colorFamily = getDominantColorFamily(primaryColors);

    const sticker: Sticker = {
      id: uuidv4(),
      name,
      imageUrl: imageData || '/placeholder.png',
      imageData,
      category: category as StickerCategory,
      source: source as StickerSource,
      themes: themes ? JSON.parse(themes) : [],
      tagIds: tagIds ? JSON.parse(tagIds) : [],
      primaryColors,
      colorFamily,
      width: 200,
      height: 200,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    const created = stickerStore.create(sticker);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('创建素材错误:', error);
    res.status(500).json({ success: false, error: '创建素材失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, category, source, themes, tagIds } = req.body;
    const updates: Partial<Sticker> = {};

    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (source !== undefined) updates.source = source;
    if (themes !== undefined) updates.themes = themes;
    if (tagIds !== undefined) updates.tagIds = tagIds;

    const updated = stickerStore.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: '素材不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新素材失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = stickerStore.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '素材不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除素材失败' });
  }
});

export default router;
