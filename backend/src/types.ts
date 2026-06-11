export type StickerCategory = 'character' | 'text' | 'decoration' | 'tape';
export type StickerSource = 'purchased' | 'printed' | 'gift';
export type ColorFamily = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink' | 'brown' | 'gray' | 'monochrome';

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
}
