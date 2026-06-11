import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { tagStore } from '../storage/store';
import { Tag } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const tags = tagStore.getAll();
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取标签列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const tag = tagStore.getById(req.params.id);
    if (!tag) {
      return res.status(404).json({ success: false, error: '标签不存在' });
    }
    res.json({ success: true, data: tag });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取标签失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: '标签名称不能为空' });
    }

    if (tagStore.getByName(name)) {
      return res.status(400).json({ success: false, error: '标签已存在' });
    }

    const tag: Tag = {
      id: uuidv4(),
      name,
      color: color || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    const created = tagStore.create(tag);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: '创建标签失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const updates: Partial<Tag> = {};

    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;

    const updated = tagStore.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: '标签不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新标签失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = tagStore.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '标签不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除标签失败' });
  }
});

export default router;
