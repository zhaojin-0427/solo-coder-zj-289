import * as fs from 'fs';
import * as path from 'path';
import { Sticker, Tag, Collage, CollageTemplate, TemplateReplacementRecord, Plan, ProcurementItem, SharedWork, WorkLike, WorkFavorite, WorkComment, SensitiveWord } from '../types';

const DATA_DIR = path.join(__dirname, '../../data');
const STICKERS_FILE = path.join(DATA_DIR, 'stickers.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const COLLAGES_FILE = path.join(DATA_DIR, 'collages.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');
const REPLACEMENTS_FILE = path.join(DATA_DIR, 'template_replacements.json');
const PLANS_FILE = path.join(DATA_DIR, 'plans.json');
const PROCUREMENT_FILE = path.join(DATA_DIR, 'procurement.json');
const SHARED_WORKS_FILE = path.join(DATA_DIR, 'shared_works.json');
const WORK_LIKES_FILE = path.join(DATA_DIR, 'work_likes.json');
const WORK_FAVORITES_FILE = path.join(DATA_DIR, 'work_favorites.json');
const WORK_COMMENTS_FILE = path.join(DATA_DIR, 'work_comments.json');
const SENSITIVE_WORDS_FILE = path.join(DATA_DIR, 'sensitive_words.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

export const stickerStore = {
  getAll(): Sticker[] {
    return readJsonFile<Sticker[]>(STICKERS_FILE, []);
  },

  getById(id: string): Sticker | undefined {
    return this.getAll().find(s => s.id === id);
  },

  create(sticker: Sticker): Sticker {
    const stickers = this.getAll();
    stickers.push(sticker);
    writeJsonFile(STICKERS_FILE, stickers);
    return sticker;
  },

  update(id: string, updates: Partial<Sticker>): Sticker | undefined {
    const stickers = this.getAll();
    const index = stickers.findIndex(s => s.id === id);
    if (index !== -1) {
      stickers[index] = { ...stickers[index], ...updates };
      writeJsonFile(STICKERS_FILE, stickers);
      return stickers[index];
    }
    return undefined;
  },

  delete(id: string): boolean {
    const stickers = this.getAll();
    const filtered = stickers.filter(s => s.id !== id);
    if (filtered.length !== stickers.length) {
      writeJsonFile(STICKERS_FILE, filtered);
      return true;
    }
    return false;
  },

  incrementUsage(id: string): void {
    const stickers = this.getAll();
    const sticker = stickers.find(s => s.id === id);
    if (sticker) {
      sticker.usageCount += 1;
      sticker.lastUsedAt = new Date().toISOString();
      writeJsonFile(STICKERS_FILE, stickers);
    }
  }
};

export const tagStore = {
  getAll(): Tag[] {
    return readJsonFile<Tag[]>(TAGS_FILE, []);
  },

  getById(id: string): Tag | undefined {
    return this.getAll().find(t => t.id === id);
  },

  getByName(name: string): Tag | undefined {
    return this.getAll().find(t => t.name === name);
  },

  create(tag: Tag): Tag {
    const tags = this.getAll();
    tags.push(tag);
    writeJsonFile(TAGS_FILE, tags);
    return tag;
  },

  update(id: string, updates: Partial<Tag>): Tag | undefined {
    const tags = this.getAll();
    const index = tags.findIndex(t => t.id === id);
    if (index !== -1) {
      tags[index] = { ...tags[index], ...updates };
      writeJsonFile(TAGS_FILE, tags);
      return tags[index];
    }
    return undefined;
  },

  delete(id: string): boolean {
    const tags = this.getAll();
    const filtered = tags.filter(t => t.id !== id);
    if (filtered.length !== tags.length) {
      writeJsonFile(TAGS_FILE, filtered);
      return true;
    }
    return false;
  },

  incrementUsage(tagIds: string[]): void {
    const tags = this.getAll();
    let changed = false;
    for (const id of tagIds) {
      const tag = tags.find(t => t.id === id);
      if (tag) {
        tag.usageCount += 1;
        changed = true;
      }
    }
    if (changed) {
      writeJsonFile(TAGS_FILE, tags);
    }
  }
};

export const collageStore = {
  getAll(): Collage[] {
    return readJsonFile<Collage[]>(COLLAGES_FILE, []);
  },

  getById(id: string): Collage | undefined {
    return this.getAll().find(c => c.id === id);
  },

  create(collage: Collage): Collage {
    const collages = this.getAll();
    collages.push(collage);
    writeJsonFile(COLLAGES_FILE, collages);
    return collage;
  },

  update(id: string, updates: Partial<Collage>): Collage | undefined {
    const collages = this.getAll();
    const index = collages.findIndex(c => c.id === id);
    if (index !== -1) {
      collages[index] = { ...collages[index], ...updates, updatedAt: new Date().toISOString() };
      writeJsonFile(COLLAGES_FILE, collages);
      return collages[index];
    }
    return undefined;
  },

  delete(id: string): boolean {
    const collages = this.getAll();
    const filtered = collages.filter(c => c.id !== id);
    if (filtered.length !== collages.length) {
      writeJsonFile(COLLAGES_FILE, filtered);
      return true;
    }
    return false;
  }
};

export const templateStore = {
  getAll(): CollageTemplate[] {
    return readJsonFile<CollageTemplate[]>(TEMPLATES_FILE, []);
  },

  getById(id: string): CollageTemplate | undefined {
    return this.getAll().find(t => t.id === id);
  },

  create(template: CollageTemplate): CollageTemplate {
    const templates = this.getAll();
    templates.push(template);
    writeJsonFile(TEMPLATES_FILE, templates);
    return template;
  },

  update(id: string, updates: Partial<CollageTemplate>): CollageTemplate | undefined {
    const templates = this.getAll();
    const index = templates.findIndex(t => t.id === id);
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updates, updatedAt: new Date().toISOString() };
      writeJsonFile(TEMPLATES_FILE, templates);
      return templates[index];
    }
    return undefined;
  },

  delete(id: string): boolean {
    const templates = this.getAll();
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length !== templates.length) {
      writeJsonFile(TEMPLATES_FILE, filtered);
      return true;
    }
    return false;
  },

  incrementUsage(id: string): void {
    const templates = this.getAll();
    const template = templates.find(t => t.id === id);
    if (template) {
      template.usageCount += 1;
      template.updatedAt = new Date().toISOString();
      writeJsonFile(TEMPLATES_FILE, templates);
    }
  }
};

export const replacementStore = {
  getAll(): TemplateReplacementRecord[] {
    return readJsonFile<TemplateReplacementRecord[]>(REPLACEMENTS_FILE, []);
  },

  create(record: TemplateReplacementRecord): TemplateReplacementRecord {
    const records = this.getAll();
    records.push(record);
    writeJsonFile(REPLACEMENTS_FILE, records);
    return record;
  },

  createBatch(records: TemplateReplacementRecord[]): TemplateReplacementRecord[] {
    const all = this.getAll();
    all.push(...records);
    writeJsonFile(REPLACEMENTS_FILE, all);
    return records;
  }
};

export const planStore = {
  getAll(): Plan[] {
    return readJsonFile<Plan[]>(PLANS_FILE, []);
  },

  getById(id: string): Plan | undefined {
    return this.getAll().find(p => p.id === id);
  },

  getByDateRange(startDate: string, endDate: string): Plan[] {
    return this.getAll().filter(p => p.date >= startDate && p.date <= endDate);
  },

  getByStatus(status: string): Plan[] {
    return this.getAll().filter(p => p.status === status);
  },

  create(plan: Plan): Plan {
    const plans = this.getAll();
    plans.push(plan);
    writeJsonFile(PLANS_FILE, plans);
    return plan;
  },

  update(id: string, updates: Partial<Plan>): Plan | undefined {
    const plans = this.getAll();
    const index = plans.findIndex(p => p.id === id);
    if (index !== -1) {
      plans[index] = { ...plans[index], ...updates, updatedAt: new Date().toISOString() };
      writeJsonFile(PLANS_FILE, plans);
      return plans[index];
    }
    return undefined;
  },

  delete(id: string): boolean {
    const plans = this.getAll();
    const filtered = plans.filter(p => p.id !== id);
    if (filtered.length !== plans.length) {
      writeJsonFile(PLANS_FILE, filtered);
      return true;
    }
    return false;
  },

  getByCollageId(collageId: string): Plan | undefined {
    return this.getAll().find(p => p.collageId === collageId);
  }
};

export const procurementStore = {
  getAll(): ProcurementItem[] {
    return readJsonFile<ProcurementItem[]>(PROCUREMENT_FILE, []);
  },

  getById(id: string): ProcurementItem | undefined {
    return this.getAll().find(p => p.id === id);
  },

  getByStatus(status: string): ProcurementItem[] {
    return this.getAll().filter(p => p.status === status);
  },

  create(item: ProcurementItem): ProcurementItem {
    const items = this.getAll();
    items.push(item);
    writeJsonFile(PROCUREMENT_FILE, items);
    return item;
  },

  update(id: string, updates: Partial<ProcurementItem>): ProcurementItem | undefined {
    const items = this.getAll();
    const index = items.findIndex(p => p.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      writeJsonFile(PROCUREMENT_FILE, items);
      return items[index];
    }
    return undefined;
  },

  delete(id: string): boolean {
    const items = this.getAll();
    const filtered = items.filter(p => p.id !== id);
    if (filtered.length !== items.length) {
      writeJsonFile(PROCUREMENT_FILE, filtered);
      return true;
    }
    return false;
  }
};

export const sharedWorkStore = {
  getAll(): SharedWork[] {
    return readJsonFile<SharedWork[]>(SHARED_WORKS_FILE, []);
  },

  getById(id: string): SharedWork | undefined {
    return this.getAll().find(w => w.id === id);
  },

  getByCollageId(collageId: string): SharedWork | undefined {
    return this.getAll().find(w => w.collageId === collageId);
  },

  getPublicWorks(): SharedWork[] {
    return this.getAll().filter(w => w.visibility === 'public');
  },

  getByAuthor(authorId: string): SharedWork[] {
    return this.getAll().filter(w => w.authorId === authorId);
  },

  create(work: SharedWork): SharedWork {
    const works = this.getAll();
    works.push(work);
    writeJsonFile(SHARED_WORKS_FILE, works);
    return work;
  },

  update(id: string, updates: Partial<SharedWork>): SharedWork | undefined {
    const works = this.getAll();
    const index = works.findIndex(w => w.id === id);
    if (index !== -1) {
      works[index] = { ...works[index], ...updates, updatedAt: new Date().toISOString() };
      writeJsonFile(SHARED_WORKS_FILE, works);
      return works[index];
    }
    return undefined;
  },

  delete(id: string): boolean {
    const works = this.getAll();
    const filtered = works.filter(w => w.id !== id);
    if (filtered.length !== works.length) {
      writeJsonFile(SHARED_WORKS_FILE, filtered);
      return true;
    }
    return false;
  },

  deleteByCollageId(collageId: string): boolean {
    const works = this.getAll();
    const filtered = works.filter(w => w.collageId !== collageId);
    if (filtered.length !== works.length) {
      writeJsonFile(SHARED_WORKS_FILE, filtered);
      return true;
    }
    return false;
  },

  incrementLike(id: string, delta: number = 1): void {
    const works = this.getAll();
    const work = works.find(w => w.id === id);
    if (work) {
      work.likeCount = Math.max(0, work.likeCount + delta);
      writeJsonFile(SHARED_WORKS_FILE, works);
    }
  },

  incrementFavorite(id: string, delta: number = 1): void {
    const works = this.getAll();
    const work = works.find(w => w.id === id);
    if (work) {
      work.favoriteCount = Math.max(0, work.favoriteCount + delta);
      writeJsonFile(SHARED_WORKS_FILE, works);
    }
  },

  incrementComment(id: string, delta: number = 1): void {
    const works = this.getAll();
    const work = works.find(w => w.id === id);
    if (work) {
      work.commentCount = Math.max(0, work.commentCount + delta);
      writeJsonFile(SHARED_WORKS_FILE, works);
    }
  },

  incrementView(id: string): void {
    const works = this.getAll();
    const work = works.find(w => w.id === id);
    if (work) {
      work.viewCount += 1;
      writeJsonFile(SHARED_WORKS_FILE, works);
    }
  }
};

export const workLikeStore = {
  getAll(): WorkLike[] {
    return readJsonFile<WorkLike[]>(WORK_LIKES_FILE, []);
  },

  getByWorkId(workId: string): WorkLike[] {
    return this.getAll().filter(l => l.workId === workId);
  },

  getByUserAndWork(userId: string, workId: string): WorkLike | undefined {
    return this.getAll().find(l => l.userId === userId && l.workId === workId);
  },

  create(like: WorkLike): WorkLike {
    const likes = this.getAll();
    likes.push(like);
    writeJsonFile(WORK_LIKES_FILE, likes);
    return like;
  },

  delete(id: string): boolean {
    const likes = this.getAll();
    const filtered = likes.filter(l => l.id !== id);
    if (filtered.length !== likes.length) {
      writeJsonFile(WORK_LIKES_FILE, filtered);
      return true;
    }
    return false;
  },

  deleteByWorkId(workId: string): void {
    const likes = this.getAll().filter(l => l.workId !== workId);
    writeJsonFile(WORK_LIKES_FILE, likes);
  }
};

export const workFavoriteStore = {
  getAll(): WorkFavorite[] {
    return readJsonFile<WorkFavorite[]>(WORK_FAVORITES_FILE, []);
  },

  getByWorkId(workId: string): WorkFavorite[] {
    return this.getAll().filter(f => f.workId === workId);
  },

  getByUserAndWork(userId: string, workId: string): WorkFavorite | undefined {
    return this.getAll().find(f => f.userId === userId && f.workId === workId);
  },

  getByUser(userId: string): WorkFavorite[] {
    return this.getAll().filter(f => f.userId === userId);
  },

  create(favorite: WorkFavorite): WorkFavorite {
    const favorites = this.getAll();
    favorites.push(favorite);
    writeJsonFile(WORK_FAVORITES_FILE, favorites);
    return favorite;
  },

  delete(id: string): boolean {
    const favorites = this.getAll();
    const filtered = favorites.filter(f => f.id !== id);
    if (filtered.length !== favorites.length) {
      writeJsonFile(WORK_FAVORITES_FILE, filtered);
      return true;
    }
    return false;
  },

  deleteByWorkId(workId: string): void {
    const favorites = this.getAll().filter(f => f.workId !== workId);
    writeJsonFile(WORK_FAVORITES_FILE, favorites);
  }
};

export const workCommentStore = {
  getAll(): WorkComment[] {
    return readJsonFile<WorkComment[]>(WORK_COMMENTS_FILE, []);
  },

  getByWorkId(workId: string): WorkComment[] {
    return this.getAll()
      .filter(c => c.workId === workId && !c.isBlocked)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  getById(id: string): WorkComment | undefined {
    return this.getAll().find(c => c.id === id);
  },

  create(comment: WorkComment): WorkComment {
    const comments = this.getAll();
    comments.push(comment);
    writeJsonFile(WORK_COMMENTS_FILE, comments);
    return comment;
  },

  delete(id: string): boolean {
    const comments = this.getAll();
    const filtered = comments.filter(c => c.id !== id);
    if (filtered.length !== comments.length) {
      writeJsonFile(WORK_COMMENTS_FILE, filtered);
      return true;
    }
    return false;
  },

  deleteByWorkId(workId: string): void {
    const comments = this.getAll().filter(c => c.workId !== workId);
    writeJsonFile(WORK_COMMENTS_FILE, comments);
  },

  markBlocked(id: string): WorkComment | undefined {
    const comments = this.getAll();
    const comment = comments.find(c => c.id === id);
    if (comment) {
      comment.isBlocked = true;
      writeJsonFile(WORK_COMMENTS_FILE, comments);
      return comment;
    }
    return undefined;
  }
};

export const sensitiveWordStore = {
  getAll(): SensitiveWord[] {
    const defaults: SensitiveWord[] = [
      { id: 'sw1', word: '垃圾', category: 'insult', createdAt: new Date().toISOString() },
      { id: 'sw2', word: '傻逼', category: 'insult', createdAt: new Date().toISOString() },
      { id: 'sw3', word: '操', category: 'vulgar', createdAt: new Date().toISOString() },
      { id: 'sw4', word: '妈的', category: 'insult', createdAt: new Date().toISOString() },
      { id: 'sw5', word: '去死', category: 'threat', createdAt: new Date().toISOString() },
      { id: 'sw6', word: '笨蛋', category: 'insult', createdAt: new Date().toISOString() },
      { id: 'sw7', word: '讨厌', category: 'negative', createdAt: new Date().toISOString() },
      { id: 'sw8', word: '恶心', category: 'negative', createdAt: new Date().toISOString() }
    ];
    const stored = readJsonFile<SensitiveWord[]>(SENSITIVE_WORDS_FILE, []);
    if (stored.length === 0) {
      writeJsonFile(SENSITIVE_WORDS_FILE, defaults);
      return defaults;
    }
    return stored;
  },

  create(word: SensitiveWord): SensitiveWord {
    const words = this.getAll();
    words.push(word);
    writeJsonFile(SENSITIVE_WORDS_FILE, words);
    return word;
  },

  delete(id: string): boolean {
    const words = this.getAll();
    const filtered = words.filter(w => w.id !== id);
    if (filtered.length !== words.length) {
      writeJsonFile(SENSITIVE_WORDS_FILE, filtered);
      return true;
    }
    return false;
  },

  checkText(text: string): { hasSensitive: boolean; matchedWords: string[]; filteredText: string } {
    const words = this.getAll();
    const matchedWords: string[] = [];
    let filteredText = text;

    for (const sw of words) {
      if (text.includes(sw.word)) {
        matchedWords.push(sw.word);
        const replacement = '*'.repeat(sw.word.length);
        filteredText = filteredText.split(sw.word).join(replacement);
      }
    }

    return { hasSensitive: matchedWords.length > 0, matchedWords, filteredText };
  }
};
