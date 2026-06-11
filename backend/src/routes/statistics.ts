import { Router, Request, Response } from 'express';
import { stickerStore, tagStore, collageStore, templateStore, replacementStore, planStore } from '../storage/store';
import { ColorFamily, Statistics, StickerCategory, StickerSource, Plan } from '../types';
import { getColorHarmonySuggestions } from '../utils/colorUtils';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const stickers = stickerStore.getAll();
    const tags = tagStore.getAll();
    const collages = collageStore.getAll();
    const templates = templateStore.getAll();
    const replacements = replacementStore.getAll();
    const now = new Date();

    const colorFamilyMap: Record<string, number> = {};
    for (const s of stickers) {
      colorFamilyMap[s.colorFamily] = (colorFamilyMap[s.colorFamily] || 0) + 1;
    }
    const colorFamilyDistribution = (Object.entries(colorFamilyMap) as [ColorFamily, number][])
      .map(([family, count]) => ({
        family,
        count,
        percentage: stickers.length > 0 ? Math.round((count / stickers.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const tagUsageMap: Record<string, number> = {};
    for (const sticker of stickers) {
      for (const tagId of sticker.tagIds) {
        tagUsageMap[tagId] = (tagUsageMap[tagId] || 0) + 1;
      }
    }
    for (const collage of collages) {
      for (const tagId of collage.tags) {
        tagUsageMap[tagId] = (tagUsageMap[tagId] || 0) + 1;
      }
    }
    const topTags = Object.entries(tagUsageMap)
      .map(([tagId, count]) => {
        const tag = tags.find(t => t.id === tagId);
        return { tagId, name: tag?.name || '未知', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const monthlyMap: Record<string, number> = {};
    for (const collage of collages) {
      const date = new Date(collage.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[month] = (monthlyMap[month] || 0) + 1;
    }
    const monthlyTrend = Object.entries(monthlyMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const unusedStickers = stickers
      .filter(s => {
        if (s.usageCount === 0) return true;
        if (!s.lastUsedAt) return true;
        return new Date(s.lastUsedAt) < thirtyDaysAgo;
      })
      .sort((a, b) => {
        const aDate = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : new Date(a.createdAt).getTime();
        const bDate = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : new Date(b.createdAt).getTime();
        return aDate - bDate;
      })
      .slice(0, 20);

    const categoryMap: Record<string, number> = {};
    for (const s of stickers) {
      categoryMap[s.category] = (categoryMap[s.category] || 0) + 1;
    }
    const categoryDistribution = (Object.entries(categoryMap) as [StickerCategory, number][])
      .map(([category, count]) => ({ category, count }));

    const sourceMap: Record<string, number> = {};
    for (const s of stickers) {
      sourceMap[s.source] = (sourceMap[s.source] || 0) + 1;
    }
    const sourceDistribution = (Object.entries(sourceMap) as [StickerSource, number][])
      .map(([source, count]) => ({ source, count }));

    const templateUsageCount = templates.reduce((sum, t) => sum + t.usageCount, 0);
    const templateDerivedCollages = collages.filter(c => c.templateId).length;
    const templateReuseRate = collages.length > 0
      ? Math.round((templateDerivedCollages / collages.length) * 100)
      : 0;

    const templateConvMap: Record<string, { templateCount: number; collageCount: number }> = {};
    for (const t of templates) {
      const date = new Date(t.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!templateConvMap[month]) templateConvMap[month] = { templateCount: 0, collageCount: 0 };
      templateConvMap[month].templateCount += 1;
    }
    for (const c of collages) {
      if (!c.templateId) continue;
      const date = new Date(c.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!templateConvMap[month]) templateConvMap[month] = { templateCount: 0, collageCount: 0 };
      templateConvMap[month].collageCount += 1;
    }
    const templateConversionTrend = Object.entries(templateConvMap)
      .map(([month, counts]) => ({ month, ...counts }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const replacedCatMap: Record<string, number> = {};
    for (const r of replacements) {
      replacedCatMap[r.originalStickerCategory] = (replacedCatMap[r.originalStickerCategory] || 0) + 1;
    }
    const mostReplacedCategories = (Object.entries(replacedCatMap) as [StickerCategory, number][])
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topTemplates = templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(t => ({ templateId: t.id, name: t.name, usageCount: t.usageCount }));

    const plans = planStore.getAll();
    const today = now.toISOString().split('T')[0];
    
    const plansToUpdate = plans.filter(p => 
      (p.status === 'pending' || p.status === 'in_progress') && p.date < today
    );
    for (const p of plansToUpdate) {
      p.status = 'overdue';
    }

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

    const stats: Statistics = {
      totalStickers: stickers.length,
      totalCollages: collages.length,
      colorFamilyDistribution,
      topTags,
      monthlyTrend,
      unusedStickers,
      categoryDistribution,
      sourceDistribution,
      totalTemplates: templates.length,
      templateUsageCount,
      templateConversionTrend,
      mostReplacedCategories,
      templateReuseRate,
      topTemplates,
      planStats: {
        totalPlans,
        completedPlans,
        completionRate,
        consecutiveDays,
        overdueCount,
        themeCompletionTrend,
        materialReuseRate,
        weeklyTrend
      }
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('统计错误:', error);
    res.status(500).json({ success: false, error: '获取统计数据失败' });
  }
});

router.get('/color-harmony', (req: Request, res: Response) => {
  try {
    const { color } = req.query;
    if (!color) {
      return res.status(400).json({ success: false, error: '缺少颜色参数' });
    }

    const result = getColorHarmonySuggestions(color as string);
    res.json({ success: true, data: { baseColor: color, ...result } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取色彩搭配建议失败' });
  }
});

export default router;
