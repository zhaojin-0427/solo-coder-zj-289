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
  isPlaceholder?: boolean;
  placeholderCategory?: StickerCategory;
  placeholderColorFamily?: ColorFamily;
  placeholderLabel?: string;
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
}

export interface TemplateReplacementRecord {
  id: string;
  templateId: string;
  collageId: string;
  originalStickerId: string;
  originalStickerCategory: StickerCategory;
  newStickerId: string;
  newStickerCategory: StickerCategory;
  createdAt: string;
}

export interface ColorHarmonySuggestion {
  baseColor: string;
  suggestions: {
    color: string;
    type: 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
    harmonyScore: number;
  }[];
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
