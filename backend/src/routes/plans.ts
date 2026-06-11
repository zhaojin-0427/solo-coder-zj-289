import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { planStore, stickerStore, collageStore } from '../storage/store';
import { Plan, PlanStatus, ColorFamily } from '../types';

const router = Router();

function updateOverdueStatus() {
  const plans = planStore.getAll();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let changed = false;

  for (const plan of plans) {
    if (plan.status === 'pending' || plan.status === 'in_progress') {
      if (plan.date < today) {
        plan.status = 'overdue';
        changed = true;
      }
    }
  }

  if (changed) {
    const fs = require('fs');
    const path = require('path');
    const PLANS_FILE = path.join(__dirname, '../../data/plans.json');
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2));
  }
}

router.get('/', (req: Request, res: Response) => {
  try {
    updateOverdueStatus();
    const { startDate, endDate, status, theme, colorFamily } = req.query;
    let plans = planStore.getAll();

    if (startDate && endDate) {
      plans = plans.filter(p => p.date >= startDate && p.date <= endDate);
    }
    if (status) {
      plans = plans.filter(p => p.status === status);
    }
    if (theme) {
      plans = plans.filter(p => p.themes.includes(theme as string));
    }
    if (colorFamily) {
      plans = plans.filter(p => p.colorFamilies.includes(colorFamily as ColorFamily));
    }

    plans.sort((a, b) => a.date.localeCompare(b.date));
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('获取计划列表错误:', error);
    res.status(500).json({ success: false, error: '获取计划列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    updateOverdueStatus();
    const plan = planStore.getById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: '计划不存在' });
    }
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取计划失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { title, description, date, themes, colorFamilies, plannedStickerIds, referenceTagIds, estimatedDuration } = req.body;

    if (!title || !date) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    const plan: Plan = {
      id: uuidv4(),
      title,
      description: description || '',
      date,
      themes: themes || [],
      colorFamilies: colorFamilies || [],
      plannedStickerIds: plannedStickerIds || [],
      referenceTagIds: referenceTagIds || [],
      estimatedDuration: estimatedDuration || 30,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const created = planStore.create(plan);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('创建计划错误:', error);
    res.status(500).json({ success: false, error: '创建计划失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { title, description, date, themes, colorFamilies, plannedStickerIds, referenceTagIds, estimatedDuration, status } = req.body;
    const updates: Partial<Plan> = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (themes !== undefined) updates.themes = themes;
    if (colorFamilies !== undefined) updates.colorFamilies = colorFamilies;
    if (plannedStickerIds !== undefined) updates.plannedStickerIds = plannedStickerIds;
    if (referenceTagIds !== undefined) updates.referenceTagIds = referenceTagIds;
    if (estimatedDuration !== undefined) updates.estimatedDuration = estimatedDuration;
    if (status !== undefined) updates.status = status;

    const updated = planStore.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: '计划不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新计划失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = planStore.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '计划不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除计划失败' });
  }
});

router.get('/:id/recommendations', (req: Request, res: Response) => {
  try {
    const plan = planStore.getById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: '计划不存在' });
    }

    const allStickers = stickerStore.getAll();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recommended = allStickers.filter(s => {
      const isUnused = s.usageCount === 0 || !s.lastUsedAt || new Date(s.lastUsedAt) < thirtyDaysAgo;
      const matchesTheme = plan.themes.length === 0 || plan.themes.some(t => s.themes.includes(t));
      const matchesColor = plan.colorFamilies.length === 0 || plan.colorFamilies.includes(s.colorFamily);
      const notInPlanned = !plan.plannedStickerIds.includes(s.id);
      
      return isUnused && (matchesTheme || matchesColor) && notInPlanned;
    });

    const sorted = recommended.sort((a, b) => {
      const aScore = (plan.themes.some(t => a.themes.includes(t)) ? 2 : 0) + 
                     (plan.colorFamilies.includes(a.colorFamily) ? 1 : 0);
      const bScore = (plan.themes.some(t => b.themes.includes(t)) ? 2 : 0) + 
                     (plan.colorFamilies.includes(b.colorFamily) ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      
      const aDate = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : new Date(a.createdAt).getTime();
      const bDate = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : new Date(b.createdAt).getTime();
      return aDate - bDate;
    }).slice(0, 12);

    res.json({ success: true, data: sorted });
  } catch (error) {
    console.error('获取推荐素材错误:', error);
    res.status(500).json({ success: false, error: '获取推荐素材失败' });
  }
});

router.post('/:id/bind-collage', (req: Request, res: Response) => {
  try {
    const { collageId } = req.body;
    const plan = planStore.getById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ success: false, error: '计划不存在' });
    }

    const collage = collageStore.getById(collageId);
    if (!collage) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    const actualStickerIds = [...new Set(collage.elements.map(e => e.stickerId))];

    const updated = planStore.update(req.params.id, {
      collageId,
      actualStickerIds,
      status: 'completed',
      completedAt: new Date().toISOString()
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('绑定作品错误:', error);
    res.status(500).json({ success: false, error: '绑定作品失败' });
  }
});

router.get('/statistics/summary', (req: Request, res: Response) => {
  try {
    updateOverdueStatus();
    const plans = planStore.getAll();
    const allStickers = stickerStore.getAll();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const totalPlans = plans.length;
    const completedPlans = plans.filter(p => p.status === 'completed').length;
    const overdueCount = plans.filter(p => p.status === 'overdue').length;
    const completionRate = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

    const completedDates = plans
      .filter(p => p.status === 'completed' && p.completedAt)
      .map(p => new Date(p.completedAt!).toISOString().split('T')[0])
      .sort();

    let consecutiveDays = 0;
    if (completedDates.length > 0) {
      let currentStreak = 0;
      let checkDate = new Date(today);
      
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (completedDates.includes(dateStr)) {
          currentStreak++;
          consecutiveDays = Math.max(consecutiveDays, currentStreak);
        } else if (i > 0) {
          currentStreak = 0;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    const themeMap: Record<string, { total: number; completed: number }> = {};
    for (const plan of plans) {
      for (const theme of plan.themes) {
        if (!themeMap[theme]) {
          themeMap[theme] = { total: 0, completed: 0 };
        }
        themeMap[theme].total++;
        if (plan.status === 'completed') {
          themeMap[theme].completed++;
        }
      }
    }
    const themeCompletionTrend = Object.entries(themeMap)
      .map(([theme, stats]) => ({ theme, ...stats }))
      .sort((a, b) => b.total - a.total);

    const plannedStickerSet = new Set<string>();
    const reusedStickerSet = new Set<string>();
    for (const plan of plans) {
      for (const id of plan.plannedStickerIds) {
        plannedStickerSet.add(id);
      }
      if (plan.actualStickerIds) {
        for (const id of plan.actualStickerIds) {
          if (plan.plannedStickerIds.includes(id)) {
            reusedStickerSet.add(id);
          }
        }
      }
    }
    const materialReuseRate = plannedStickerSet.size > 0 
      ? Math.round((reusedStickerSet.size / plannedStickerSet.size) * 100) 
      : 0;

    const weekMap: Record<string, { total: number; completed: number }> = {};
    for (const plan of plans) {
      const date = new Date(plan.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap[weekKey]) {
        weekMap[weekKey] = { total: 0, completed: 0 };
      }
      weekMap[weekKey].total++;
      if (plan.status === 'completed') {
        weekMap[weekKey].completed++;
      }
    }
    const weeklyTrend = Object.entries(weekMap)
      .map(([week, stats]) => ({ week, ...stats }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12);

    res.json({
      success: true,
      data: {
        totalPlans,
        completedPlans,
        completionRate,
        consecutiveDays,
        overdueCount,
        themeCompletionTrend,
        materialReuseRate,
        weeklyTrend
      }
    });
  } catch (error) {
    console.error('获取计划统计错误:', error);
    res.status(500).json({ success: false, error: '获取计划统计失败' });
  }
});

router.get('/themes/available', (req: Request, res: Response) => {
  try {
    const stickers = stickerStore.getAll();
    const themes = new Set<string>();
    for (const s of stickers) {
      for (const t of s.themes) {
        themes.add(t);
      }
    }
    res.json({ success: true, data: Array.from(themes) });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取主题列表失败' });
  }
});

export default router;
