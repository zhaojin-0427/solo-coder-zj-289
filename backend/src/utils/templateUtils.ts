import { Sticker, TemplateElement, CollageElement, ReplacementInfo, ColorFamily, StickerCategory } from '../types';
import { calculateColorDistance } from './colorUtils';

export interface ReplacementCandidate {
  sticker: Sticker;
  score: number;
  reasons: string[];
}

export function findReplacementSticker(
  templateElement: TemplateElement,
  allStickers: Sticker[],
  usedStickerIds: Set<string>
): ReplacementCandidate | null {
  const targetCategory = templateElement.originalStickerCategory;
  const targetColorFamily = templateElement.originalStickerColorFamily;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const candidates: ReplacementCandidate[] = [];

  for (const sticker of allStickers) {
    if (usedStickerIds.has(sticker.id)) continue;
    if (sticker.id === templateElement.originalStickerId) continue;

    const reasons: string[] = [];
    let score = 0;

    if (sticker.category === targetCategory) {
      score += 40;
      reasons.push(`分类匹配：${getCategoryLabel(targetCategory)}`);
    }

    if (sticker.colorFamily === targetColorFamily) {
      score += 30;
      reasons.push(`色系匹配：${getColorFamilyLabel(targetColorFamily)}`);
    } else {
      const colorHarmony = calculateColorHarmony(sticker.colorFamily, targetColorFamily);
      if (colorHarmony > 0) {
        score += colorHarmony * 15;
        reasons.push(`色彩和谐度 ${colorHarmony}%`);
      }
    }

    const isUnused = sticker.usageCount === 0;
    const isLongUnused = sticker.lastUsedAt && new Date(sticker.lastUsedAt) < thirtyDaysAgo;
    if (isUnused) {
      score += 20;
      reasons.push('从未使用，推荐激活');
    } else if (isLongUnused) {
      score += 15;
      reasons.push('长期未使用，推荐复用');
    }

    if (sticker.primaryColors.length > 0 && templateElement.originalStickerId) {
      const originalSticker = allStickers.find(s => s.id === templateElement.originalStickerId);
      if (originalSticker && originalSticker.primaryColors.length > 0) {
        const colorDist = calculateColorDistance(
          sticker.primaryColors[0],
          originalSticker.primaryColors[0]
        );
        const colorSimScore = Math.max(0, 100 - colorDist / 8);
        score += colorSimScore * 0.1;
        if (colorSimScore > 70) {
          reasons.push(`主色相近度 ${Math.round(colorSimScore)}%`);
        }
      }
    }

    if (score >= 30) {
      candidates.push({ sticker, score, reasons });
    }
  }

  if (candidates.length === 0) {
    const fallback = allStickers.find(s => !usedStickerIds.has(s.id) && s.category === targetCategory);
    if (fallback) {
      return {
        sticker: fallback,
        score: 10,
        reasons: [`分类兜底匹配：${getCategoryLabel(targetCategory)}`]
      };
    }
    const anyFallback = allStickers.find(s => !usedStickerIds.has(s.id));
    if (anyFallback) {
      return {
        sticker: anyFallback,
        score: 1,
        reasons: ['素材库智能推荐']
      };
    }
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function calculateColorHarmony(c1: ColorFamily, c2: ColorFamily): number {
  const harmonyMap: Record<string, number> = {
    'red-green': 60, 'green-red': 60,
    'blue-orange': 60, 'orange-blue': 60,
    'yellow-purple': 60, 'purple-yellow': 60,
    'red-orange': 75, 'orange-red': 75,
    'orange-yellow': 75, 'yellow-orange': 75,
    'yellow-green': 75, 'green-yellow': 75,
    'green-cyan': 75, 'cyan-green': 75,
    'cyan-blue': 75, 'blue-cyan': 75,
    'blue-purple': 75, 'purple-blue': 75,
    'purple-pink': 75, 'pink-purple': 75,
    'pink-red': 75, 'red-pink': 75,
    'monochrome-gray': 85, 'gray-monochrome': 85,
    'brown-orange': 70, 'orange-brown': 70,
    'brown-red': 65, 'red-brown': 65
  };
  if (c1 === c2) return 100;
  return harmonyMap[`${c1}-${c2}`] || 0;
}

export function autoReplaceTemplateElements(
  templateElements: TemplateElement[],
  allStickers: Sticker[]
): { elements: CollageElement[]; replacements: ReplacementInfo[] } {
  const elements: CollageElement[] = [];
  const replacements: ReplacementInfo[] = [];
  const usedStickerIds = new Set<string>();

  for (const tplElem of templateElements) {
    const candidate = findReplacementSticker(tplElem, allStickers, usedStickerIds);
    if (candidate) {
      usedStickerIds.add(candidate.sticker.id);
      const newElement: CollageElement = {
        id: `elem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        stickerId: candidate.sticker.id,
        x: tplElem.x,
        y: tplElem.y,
        width: tplElem.width,
        height: tplElem.height,
        rotation: tplElem.rotation,
        zIndex: tplElem.zIndex
      };
      elements.push(newElement);

      const originalSticker = allStickers.find(s => s.id === tplElem.originalStickerId);
      replacements.push({
        elementId: newElement.id,
        originalStickerId: tplElem.originalStickerId,
        originalStickerName: originalSticker?.name || '原素材',
        newStickerId: candidate.sticker.id,
        newStickerName: candidate.sticker.name,
        reasons: candidate.reasons,
        harmonyScore: Math.round(candidate.score)
      });
    } else {
      const newElement: CollageElement = {
        id: `elem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        stickerId: tplElem.originalStickerId,
        x: tplElem.x,
        y: tplElem.y,
        width: tplElem.width,
        height: tplElem.height,
        rotation: tplElem.rotation,
        zIndex: tplElem.zIndex
      };
      elements.push(newElement);
    }
  }

  return { elements, replacements };
}

export function convertTemplateElementsToCollage(
  templateElements: TemplateElement[],
  keepOriginal: boolean,
  allStickers: Sticker[]
): { elements: CollageElement[]; replacements: ReplacementInfo[] } {
  if (keepOriginal) {
    const elements = templateElements.map(tpl => ({
      id: `elem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${Math.random().toString(36).slice(2, 5)}`,
      stickerId: tpl.originalStickerId,
      x: tpl.x,
      y: tpl.y,
      width: tpl.width,
      height: tpl.height,
      rotation: tpl.rotation,
      zIndex: tpl.zIndex
    }));
    return { elements, replacements: [] };
  }
  return autoReplaceTemplateElements(templateElements, allStickers);
}

export function generatePlaceholderElements(
  templateElements: TemplateElement[]
): CollageElement[] {
  return templateElements.map(tpl => ({
    id: `placeholder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    stickerId: '__placeholder__',
    x: tpl.x,
    y: tpl.y,
    width: tpl.width,
    height: tpl.height,
    rotation: tpl.rotation,
    zIndex: tpl.zIndex
  }));
}

function getCategoryLabel(cat: StickerCategory): string {
  const labels: Record<StickerCategory, string> = {
    character: '人物',
    text: '文字',
    decoration: '装饰',
    tape: '胶带'
  };
  return labels[cat] || cat;
}

function getColorFamilyLabel(family: ColorFamily): string {
  const labels: Record<ColorFamily, string> = {
    red: '红色系',
    orange: '橙色系',
    yellow: '黄色系',
    green: '绿色系',
    cyan: '青色系',
    blue: '蓝色系',
    purple: '紫色系',
    pink: '粉色系',
    brown: '棕色系',
    gray: '灰色系',
    monochrome: '黑白系'
  };
  return labels[family] || family;
}
