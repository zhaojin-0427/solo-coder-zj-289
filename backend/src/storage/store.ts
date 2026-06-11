import * as fs from 'fs';
import * as path from 'path';
import { Sticker, Tag, Collage, CollageTemplate, TemplateReplacementRecord, Plan } from '../types';

const DATA_DIR = path.join(__dirname, '../../data');
const STICKERS_FILE = path.join(DATA_DIR, 'stickers.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const COLLAGES_FILE = path.join(DATA_DIR, 'collages.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');
const REPLACEMENTS_FILE = path.join(DATA_DIR, 'template_replacements.json');
const PLANS_FILE = path.join(DATA_DIR, 'plans.json');

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
