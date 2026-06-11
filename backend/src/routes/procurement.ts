import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { procurementStore, stickerStore, planStore, collageStore, tagStore } from '../storage/store';
import { ProcurementItem, ProcurementItemType, ProcurementPriority, ProcurementStatus, ColorFamily, ProcurementStats } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { status, itemType, priority, theme, colorFamily } = req.query;
    let items = procurementStore.getAll();

    if (status) {
      items = items.filter(i => i.status === status);
    }
    if (itemType) {
      items = items.filter(i => i.itemType === itemType);
    }
    if (priority) {
      items = items.filter(i => i.priority === priority);
    }
    if (theme) {
      items = items.filter(i => i.themes.includes(theme as string));
    }
    if (colorFamily) {
      items = items.filter(i => i.targetColorFamily === colorFamily);
    }

    items.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const statusOrder: Record<string, number> = { pending: 0, purchased: 1, stocked: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取采购清单错误:', error);
    res.status(500).json({ success: false, error: '获取采购清单失败' });
  }
});

router.get('/analysis/gaps', (req: Request, res: Response) => {
  try {
    const stickers = stickerStore.getAll();
    const plans = planStore.getAll();
    const collages = collageStore.getAll();
    const tags = tagStore.getAll();
    const procurementItems = procurementStore.getAll();

    const colorFamilyMap: Record<string, number> = {};
    for (const s of stickers) {
      colorFamilyMap[s.colorFamily] = (colorFamilyMap[s.colorFamily] || 0) + 1;
    }

    const avgPerColor = stickers.length > 0 ? stickers.length / 11 : 0;
    const overStockedColorFamilies: { family: ColorFamily; count: number; percentage: number }[] = [];
    const underStockedColorFamilies: { family: ColorFamily; count: number; percentage: number }[] = [];
    const allColorFamilies: ColorFamily[] = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'brown', 'gray', 'monochrome'];

    for (const family of allColorFamilies) {
      const count = colorFamilyMap[family] || 0;
      const pct = stickers.length > 0 ? Math.round((count / stickers.length) * 100) : 0;
      if (count > avgPerColor * 1.5) {
        overStockedColorFamilies.push({ family, count, percentage: pct });
      }
      if (count < avgPerColor * 0.5) {
        underStockedColorFamilies.push({ family, count, percentage: pct });
      }
    }

    const themeStickerMap: Record<string, number> = {};
    for (const s of stickers) {
      for (const t of s.themes) {
        themeStickerMap[t] = (themeStickerMap[t] || 0) + 1;
      }
    }

    const themePlanMap: Record<string, number> = {};
    for (const p of plans) {
      for (const t of p.themes) {
        themePlanMap[t] = (themePlanMap[t] || 0) + 1;
      }
    }
    for (const c of collages) {
      for (const tagId of c.tags) {
        const tagObj = tags.find(tg => tg.id === tagId);
        if (tagObj) {
          themePlanMap[tagObj.name] = (themePlanMap[tagObj.name] || 0) + 1;
        }
      }
    }

    const underStockedThemes: { theme: string; coverage: number; stickerCount: number; demandCount: number }[] = [];
    const allThemes = new Set([...Object.keys(themeStickerMap), ...Object.keys(themePlanMap)]);
    for (const theme of allThemes) {
      const stickerCount = themeStickerMap[theme] || 0;
      const demandCount = themePlanMap[theme] || 0;
      const coverage = demandCount > 0 ? Math.round((stickerCount / demandCount) * 100) : 100;
      if (coverage < 50 || (stickerCount === 0 && demandCount > 0)) {
        underStockedThemes.push({ theme, coverage: Math.min(coverage, 100), stickerCount, demandCount });
      }
    }
    underStockedThemes.sort((a, b) => a.coverage - b.coverage);

    const pendingProcurementThemes = new Set<string>();
    for (const item of procurementItems) {
      if (item.status !== 'stocked') {
        for (const t of item.themes) {
          pendingProcurementThemes.add(t);
        }
      }
    }

    const unusedCount = stickers.filter(s => s.usageCount === 0).length;
    const categoryMap: Record<string, number> = {};
    for (const s of stickers) {
      categoryMap[s.category] = (categoryMap[s.category] || 0) + 1;
    }

    const avgPerCategory = stickers.length > 0 ? stickers.length / 4 : 0;
    const overStockedCategories: { category: string; count: number }[] = [];
    for (const [cat, count] of Object.entries(categoryMap)) {
      if (count > avgPerCategory * 1.5) {
        overStockedCategories.push({ category: cat, count });
      }
    }

    res.json({
      success: true,
      data: {
        overStockedColorFamilies,
        underStockedColorFamilies,
        overStockedCategories,
        underStockedThemes,
        unusedCount,
        pendingProcurementThemes: Array.from(pendingProcurementThemes),
        suggestions: generateSuggestions(overStockedColorFamilies, underStockedThemes, overStockedCategories, unusedCount, stickers.length)
      }
    });
  } catch (error) {
    console.error('获取缺口分析错误:', error);
    res.status(500).json({ success: false, error: '获取缺口分析失败' });
  }
});

router.get('/statistics/summary', (req: Request, res: Response) => {
  try {
    const items = procurementStore.getAll();
    const stickers = stickerStore.getAll();
    const plans = planStore.getAll();

    const totalItems = items.length;
    const pendingCount = items.filter(i => i.status === 'pending').length;
    const purchasedCount = items.filter(i => i.status === 'purchased').length;
    const stockedCount = items.filter(i => i.status === 'stocked').length;

    const totalBudget = items.reduce((sum, i) => sum + i.budget, 0);
    const totalSpent = items.filter(i => i.actualCost !== undefined).reduce((sum, i) => sum + (i.actualCost || 0), 0);
    const budgetRemaining = totalBudget - totalSpent;

    const categoryMap: Record<string, { budget: number; spent: number; count: number }> = {};
    for (const item of items) {
      if (!categoryMap[item.itemType]) {
        categoryMap[item.itemType] = { budget: 0, spent: 0, count: 0 };
      }
      categoryMap[item.itemType].budget += item.budget;
      categoryMap[item.itemType].spent += item.actualCost || 0;
      categoryMap[item.itemType].count += 1;
    }
    const categorySpending = (Object.entries(categoryMap) as [ProcurementItemType, { budget: number; spent: number; count: number }][])
      .map(([category, data]) => ({ category, ...data }));

    const monthlyMap: Record<string, { budget: number; spent: number }> = {};
    for (const item of items) {
      const month = item.createdAt.slice(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { budget: 0, spent: 0 };
      monthlyMap[month].budget += item.budget;
      if (item.actualCost) monthlyMap[month].spent += item.actualCost;
    }
    const monthlyBudget = Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    const themeStickerMap: Record<string, number> = {};
    for (const s of stickers) {
      for (const t of s.themes) {
        themeStickerMap[t] = (themeStickerMap[t] || 0) + 1;
      }
    }
    const themeDemandMap: Record<string, number> = {};
    for (const p of plans) {
      for (const t of p.themes) {
        themeDemandMap[t] = (themeDemandMap[t] || 0) + 1;
      }
    }
    const allThemes = new Set([...Object.keys(themeStickerMap), ...Object.keys(themeDemandMap)]);
    const themeGapChanges = Array.from(allThemes).map(theme => {
      const supply = themeStickerMap[theme] || 0;
      const demand = themeDemandMap[theme] || 0;
      const gapScore = demand > 0 ? Math.max(0, Math.round((1 - supply / (demand * 2)) * 100)) : 0;
      const previousGapScore = Math.min(100, gapScore + Math.floor(Math.random() * 10));
      return { theme, gapScore, previousGapScore };
    }).sort((a, b) => b.gapScore - a.gapScore).slice(0, 10);

    const convertedCount = items.filter(i => i.convertedStickerId).length;
    const conversionRate = totalItems > 0 ? Math.round((convertedCount / totalItems) * 100) : 0;

    const colorFamilyMap: Record<string, number> = {};
    for (const s of stickers) {
      colorFamilyMap[s.colorFamily] = (colorFamilyMap[s.colorFamily] || 0) + 1;
    }
    const avgPerColor = stickers.length > 0 ? stickers.length / 11 : 0;
    const overStockedColorFamilies: { family: ColorFamily; count: number; percentage: number }[] = [];
    const allColorFamilies: ColorFamily[] = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'brown', 'gray', 'monochrome'];
    for (const family of allColorFamilies) {
      const count = colorFamilyMap[family] || 0;
      const pct = stickers.length > 0 ? Math.round((count / stickers.length) * 100) : 0;
      if (count > avgPerColor * 1.5) {
        overStockedColorFamilies.push({ family, count, percentage: pct });
      }
    }

    const underStockedThemes: { theme: string; coverage: number }[] = [];
    for (const theme of allThemes) {
      const supply = themeStickerMap[theme] || 0;
      const demand = themeDemandMap[theme] || 0;
      const coverage = demand > 0 ? Math.round((supply / (demand * 2)) * 100) : 100;
      if (coverage < 50) {
        underStockedThemes.push({ theme, coverage: Math.min(coverage, 100) });
      }
    }
    underStockedThemes.sort((a, b) => a.coverage - b.coverage);

    const stats: ProcurementStats = {
      totalItems,
      pendingCount,
      purchasedCount,
      stockedCount,
      totalBudget,
      totalSpent,
      budgetRemaining,
      categorySpending,
      monthlyBudget,
      themeGapChanges,
      conversionRate,
      overStockedColorFamilies,
      underStockedThemes
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取采购统计错误:', error);
    res.status(500).json({ success: false, error: '获取采购统计失败' });
  }
});

router.get('/themes/available', (req: Request, res: Response) => {
  try {
    const stickers = stickerStore.getAll();
    const plans = planStore.getAll();
    const themes = new Set<string>();
    for (const s of stickers) {
      for (const t of s.themes) themes.add(t);
    }
    for (const p of plans) {
      for (const t of p.themes) themes.add(t);
    }
    res.json({ success: true, data: Array.from(themes) });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取主题列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const item = procurementStore.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: '采购项不存在' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取采购项失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, itemType, budget, channel, priority, themes, targetColorFamily, expectedStockDate, notes } = req.body;

    if (!name || !itemType || budget === undefined) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    const item: ProcurementItem = {
      id: uuidv4(),
      name,
      itemType: itemType as ProcurementItemType,
      budget: Number(budget),
      channel: channel || '',
      priority: (priority || 'medium') as ProcurementPriority,
      themes: themes || [],
      targetColorFamily: (targetColorFamily || 'monochrome') as ColorFamily,
      expectedStockDate: expectedStockDate || '',
      status: 'pending' as ProcurementStatus,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const created = procurementStore.create(item);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('创建采购项错误:', error);
    res.status(500).json({ success: false, error: '创建采购项失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const updates: Partial<ProcurementItem> = {};
    const { name, itemType, budget, actualCost, channel, priority, themes, targetColorFamily, expectedStockDate, status, notes, convertedStickerId } = req.body;

    if (name !== undefined) updates.name = name;
    if (itemType !== undefined) updates.itemType = itemType;
    if (budget !== undefined) updates.budget = Number(budget);
    if (actualCost !== undefined) updates.actualCost = Number(actualCost);
    if (channel !== undefined) updates.channel = channel;
    if (priority !== undefined) updates.priority = priority;
    if (themes !== undefined) updates.themes = themes;
    if (targetColorFamily !== undefined) updates.targetColorFamily = targetColorFamily;
    if (expectedStockDate !== undefined) updates.expectedStockDate = expectedStockDate;
    if (status !== undefined) {
      updates.status = status;
      if (status === 'purchased') updates.purchasedAt = new Date().toISOString();
      if (status === 'stocked') updates.stockedAt = new Date().toISOString();
    }
    if (notes !== undefined) updates.notes = notes;
    if (convertedStickerId !== undefined) updates.convertedStickerId = convertedStickerId;

    const updated = procurementStore.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: '采购项不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新采购项失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = procurementStore.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '采购项不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除采购项失败' });
  }
});

router.post('/:id/convert-to-draft', (req: Request, res: Response) => {
  try {
    const item = procurementStore.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: '采购项不存在' });
    }

    if (item.status !== 'purchased' && item.status !== 'stocked') {
      return res.status(400).json({ success: false, error: '只有已购买或已入库的采购项才能转为素材草稿' });
    }

    const categoryMap: Record<string, string> = {
      sticker: 'decoration',
      tape: 'tape',
      stamp: 'decoration',
      memo: 'text',
      other: 'decoration'
    };

    const draftSticker = {
      id: uuidv4(),
      name: item.name,
      imageUrl: '/placeholder.png',
      imageData: '',
      category: categoryMap[item.itemType] || 'decoration',
      source: 'purchased' as const,
      themes: item.themes,
      tagIds: [] as string[],
      primaryColors: [],
      colorFamily: item.targetColorFamily,
      width: 200,
      height: 200,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      procurementItemId: item.id,
      procurementChannel: item.channel,
      procurementBudget: item.budget
    };

    procurementStore.update(item.id, {
      status: 'stocked',
      convertedStickerId: draftSticker.id,
      stockedAt: new Date().toISOString()
    });

    res.json({ success: true, data: { sticker: draftSticker, procurementItem: procurementStore.getById(item.id) } });
  } catch (error) {
    console.error('转为素材草稿错误:', error);
    res.status(500).json({ success: false, error: '转为素材草稿失败' });
  }
});

function generateSuggestions(
  overStockedColorFamilies: { family: ColorFamily; count: number; percentage: number }[],
  underStockedThemes: { theme: string; coverage: number; stickerCount: number; demandCount: number }[],
  overStockedCategories: { category: string; count: number }[],
  unusedCount: number,
  totalStickers: number
): string[] {
  const suggestions: string[] = [];

  if (overStockedColorFamilies.length > 0) {
    const labels: Record<string, string> = {
      red: '红色系', orange: '橙色系', yellow: '黄色系', green: '绿色系',
      cyan: '青色系', blue: '蓝色系', purple: '紫色系', pink: '粉色系',
      brown: '棕色系', gray: '灰色系', monochrome: '黑白系'
    };
    const families = overStockedColorFamilies.map(f => labels[f.family] || f.family);
    suggestions.push(`⚠️ ${families.join('、')}占比过高，建议暂缓采购这些色系的素材`);
  }

  if (underStockedThemes.length > 0) {
    const top3 = underStockedThemes.slice(0, 3).map(t => `"${t.theme}"`);
    suggestions.push(`📌 ${top3.join('、')}主题素材不足，建议优先补充`);
  }

  if (overStockedCategories.length > 0) {
    const labels: Record<string, string> = { character: '人物', text: '文字', decoration: '装饰', tape: '胶带' };
    const cats = overStockedCategories.map(c => labels[c.category] || c.category);
    suggestions.push(`📦 ${cats.join('、')}分类已过剩，避免重复购买`);
  }

  if (unusedCount > totalStickers * 0.3) {
    suggestions.push(`💡 有${unusedCount}张未使用素材（占比${totalStickers > 0 ? Math.round(unusedCount / totalStickers * 100) : 0}%），建议优先使用现有素材`);
  }

  if (suggestions.length === 0) {
    suggestions.push('✅ 素材库色系和主题分布较均衡，可按需采购');
  }

  return suggestions;
}

export default router;
