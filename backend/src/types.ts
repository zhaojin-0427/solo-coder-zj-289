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

export type PlanStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export type ProcurementItemType = 'sticker' | 'tape' | 'stamp' | 'memo' | 'other';
export type ProcurementPriority = 'high' | 'medium' | 'low';
export type ProcurementStatus = 'pending' | 'purchased' | 'stocked';

export interface ProcurementItem {
  id: string;
  name: string;
  itemType: ProcurementItemType;
  budget: number;
  actualCost?: number;
  channel: string;
  priority: ProcurementPriority;
  themes: string[];
  targetColorFamily: ColorFamily;
  expectedStockDate: string;
  status: ProcurementStatus;
  notes: string;
  convertedStickerId?: string;
  purchasedAt?: string;
  stockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementStats {
  totalItems: number;
  pendingCount: number;
  purchasedCount: number;
  stockedCount: number;
  totalBudget: number;
  totalSpent: number;
  budgetRemaining: number;
  categorySpending: { category: ProcurementItemType; budget: number; spent: number; count: number }[];
  monthlyBudget: { month: string; budget: number; spent: number }[];
  themeGapChanges: { theme: string; gapScore: number; previousGapScore: number }[];
  conversionRate: number;
  overStockedColorFamilies: { family: ColorFamily; count: number; percentage: number }[];
  underStockedThemes: { theme: string; coverage: number }[];
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  date: string;
  themes: string[];
  colorFamilies: ColorFamily[];
  plannedStickerIds: string[];
  referenceTagIds: string[];
  estimatedDuration: number;
  status: PlanStatus;
  collageId?: string;
  actualStickerIds?: string[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanStatistics {
  totalPlans: number;
  completedPlans: number;
  completionRate: number;
  consecutiveDays: number;
  overdueCount: number;
  themeCompletionTrend: { theme: string; total: number; completed: number }[];
  materialReuseRate: number;
  weeklyTrend: { week: string; total: number; completed: number }[];
}

export type ShareVisibility = 'public' | 'private';

export interface SharedWork {
  id: string;
  collageId: string;
  title: string;
  description: string;
  themes: string[];
  tags: string[];
  colorFamilies: ColorFamily[];
  visibility: ShareVisibility;
  allowComments: boolean;
  authorId: string;
  authorName: string;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  viewCount: number;
  materialCount: number;
  previewImage?: string;
  publishedAt: string;
  updatedAt: string;
}

export interface WorkLike {
  id: string;
  workId: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface WorkFavorite {
  id: string;
  workId: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface WorkComment {
  id: string;
  workId: string;
  userId: string;
  userName: string;
  content: string;
  isBlocked: boolean;
  createdAt: string;
}

export interface SensitiveWord {
  id: string;
  word: string;
  category: string;
  createdAt: string;
}

export interface SharingStats {
  totalPublishedWorks: number;
  publicWorksCount: number;
  privateWorksCount: number;
  totalLikes: number;
  totalFavorites: number;
  totalComments: number;
  totalViews: number;
  interactionTrend: { date: string; likes: number; favorites: number; comments: number; views: number }[];
  topThemes: { theme: string; workCount: number; interactionCount: number }[];
  mostPopularWorks: { workId: string; title: string; likeCount: number; favoriteCount: number; commentCount: number; viewCount: number; totalScore: number }[];
  likeFavoriteConversionRate: number;
  mostFeedbackMaterials: { stickerId: string; stickerName: string; likes: number; favorites: number; comments: number; feedbackCount: number; workCount: number; usageCount: number }[];
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
  planStats?: PlanStatistics;
  procurementStats?: ProcurementStats;
  sharingStats?: SharingStats;
}
