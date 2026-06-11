import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collageStore, stickerStore, tagStore } from '../storage/store';
import { Collage } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { tag, search } = req.query;
    let collages = collageStore.getAll().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (tag) {
      collages = collages.filter(c => c.tags.includes(tag as string));
    }
    if (search) {
      const searchStr = (search as string).toLowerCase();
      collages = collages.filter(c =>
        c.title.toLowerCase().includes(searchStr) ||
        c.description.toLowerCase().includes(searchStr)
      );
    }

    res.json({ success: true, data: collages });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取作品列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const collage = collageStore.getById(req.params.id);
    if (!collage) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }
    res.json({ success: true, data: collage });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取作品失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { title, description, elements, backgroundColor, canvasWidth, canvasHeight, tags, templateId, templateName } = req.body;

    if (!title || !elements) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    const collage: Collage = {
      id: uuidv4(),
      title,
      description: description || '',
      elements,
      backgroundColor: backgroundColor || '#FFFFFF',
      canvasWidth: canvasWidth || 800,
      canvasHeight: canvasHeight || 1100,
      tags: tags || [],
      templateId,
      templateName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const created = collageStore.create(collage);

    const stickerIds = [...new Set(elements.map((e: { stickerId: string }) => e.stickerId))];
    for (const id of stickerIds) {
      stickerStore.incrementUsage(id as string);
    }

    if (tags && tags.length > 0) {
      tagStore.incrementUsage(tags);
    }

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('创建作品错误:', error);
    res.status(500).json({ success: false, error: '创建作品失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { title, description, elements, backgroundColor, canvasWidth, canvasHeight, tags, templateId, templateName } = req.body;
    const updates: Partial<Collage> = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (elements !== undefined) updates.elements = elements;
    if (backgroundColor !== undefined) updates.backgroundColor = backgroundColor;
    if (canvasWidth !== undefined) updates.canvasWidth = canvasWidth;
    if (canvasHeight !== undefined) updates.canvasHeight = canvasHeight;
    if (tags !== undefined) updates.tags = tags;
    if (templateId !== undefined) updates.templateId = templateId;
    if (templateName !== undefined) updates.templateName = templateName;

    const updated = collageStore.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新作品失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = collageStore.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除作品失败' });
  }
});

export default router;
