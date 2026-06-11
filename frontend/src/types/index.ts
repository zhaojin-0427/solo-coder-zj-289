export type StickerCategory = 'character' | 'text' | 'decoration' | 'tape';
export type StickerSource = 'purchased' | 'printed' | 'gift';
export type ColorFamily = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink' | 'brown' | 'gray' | 'monochrome';
export type TemplateApplyMode = 'keep_materials' | 'placeholders_only' | 'auto_replace';

export interface Sticker {
  id: string;
  name: string;
  imageUrl: string;
  imageData?: string;
  category: StickerCategory;
  source: StickerSource;
  themes: string[];
  tagIds: string[];
  primaryColors: string[];
  colorFamily: ColorFamily;
  width: number;
  height: number;
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  usageCount: number;
}

export interface CollageElement {
  id: string;
  stickerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface TemplateElement {
  id: string;
  originalStickerId: string;
  originalStickerCategory: StickerCategory;
  originalStickerColorFamily: ColorFamily;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  placeholderLabel?: string;
}

export interface Collage {
  id: string;
  title: string;
  description: string;
  elements: CollageElement[];
  backgroundColor: string;
  canvasWidth: number;
  canvasHeight: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  templateId?: string;
  templateName?: string;
}

export interface CollageTemplate {
  id: string;
  name: string;
  description: string;
  elements: TemplateElement[];
  backgroundColor: string;
  canvasWidth: number;
  canvasHeight: number;
  tags: string[];
  themes: string[];
  colorFamilies: ColorFamily[];
  sourceCollageId?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReplacementInfo {
  elementId: string;
  originalStickerId: string;
  originalStickerName: string;
  newStickerId: string;
  newStickerName: string;
  reasons: string[];
  harmonyScore: number;
}

export interface TemplateApplyResult {
  elements: CollageElement[];
  backgroundColor: string;
  canvasWidth: number;
  canvasHeight: number;
  replacements: ReplacementInfo[];
  templateId: string;
  templateName: string;
}

export interface HarmonySuggestion {
  color: string;
  type: 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
  harmonyScore: number;
}

export interface ColorHarmonyResult {
  baseColor: string;
  suggestions: HarmonySuggestion[];
}

export interface Statistics {
  totalStickers: number;
  totalCollages: number;
  colorFamilyDistribution: { family: ColorFamily; count: number; percentage: number }[];
  topTags: { tagId: string; name: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  unusedStickers: Sticker[];
  categoryDistribution: { category: StickerCategory; count: number }[];
  sourceDistribution: { source: StickerSource; count: number }[];
  totalTemplates: number;
  templateUsageCount: number;
  templateConversionTrend: { month: string; templateCount: number; collageCount: number }[];
  mostReplacedCategories: { category: StickerCategory; count: number }[];
  templateReuseRate: number;
  topTemplates: { templateId: string; name: string; usageCount: number }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const CategoryLabels: Record<StickerCategory, string> = {
  character: '人物',
  text: '文字',
  decoration: '装饰',
  tape: '胶带'
};

export const SourceLabels: Record<StickerSource, string> = {
  purchased: '自购',
  printed: '打印',
  gift: '朋友赠送'
};

export const ColorFamilyLabels: Record<ColorFamily, string> = {
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

export const HarmonyTypeLabels: Record<HarmonySuggestion['type'], string> = {
  complementary: '互补色',
  analogous: '邻近色',
  triadic: '三角色',
  'split-complementary': '分裂互补'
};
