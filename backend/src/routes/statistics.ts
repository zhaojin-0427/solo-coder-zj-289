import { Router, Request, Response } from 'express';
import { stickerStore, tagStore, collageStore, templateStore, replacementStore } from '../storage/store';
import { ColorFamily, Statistics, StickerCategory, StickerSource } from '../types';
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
      topTemplates
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
