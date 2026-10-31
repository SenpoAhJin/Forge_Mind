import type { PlanningBrief, PlanningBriefInput } from '../types/planningBrief';

// Keep a saved image self-contained: picker cache paths and browser blob URLs expire.
export const MAX_REFERENCE_BYTES = 1024 * 1024;

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parsePlanningBudget(value: string): number | null {
  // Do not silently accept partial input such as "5000abc", negatives or exponents.
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const budget = Number(trimmed);
  return Number.isFinite(budget) && budget <= 9999999999.99 ? budget : null;
}

function validateBriefFields(input: Omit<PlanningBriefInput, 'reference_image'>, today?: string): void {
  if (!input.character_name.trim() || input.character_name.trim().length > 200) {
    throw new Error('Enter a character and outfit name of up to 200 characters.');
  }
  if (!['beginner', 'intermediate', 'advanced'].includes(input.skill_level)) {
    throw new Error('Choose your skill level.');
  }
  if (typeof input.budget !== 'number' || !Number.isFinite(input.budget) || input.budget < 0 ||
      input.budget > 9999999999.99 || Math.abs(input.budget * 100 - Math.round(input.budget * 100)) > 0.001) {
    throw new Error('Enter a valid budget of zero or more pesos, with up to two decimal places.');
  }
  if (!isCalendarDate(input.target_date)) throw new Error('Choose a valid target date.');
  if (today && input.target_date < today) throw new Error('Target date must be today or later.');
}

export function validatePlanningBrief(input: PlanningBriefInput, today?: string): void {
  validateBriefFields(input, today);
  const image = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.reference_image);
  if (!image || image[1].length % 4 !== 0) {
    throw new Error('Choose a JPEG, PNG or WebP reference image.');
  }
  if (image[1].length > Math.ceil(MAX_REFERENCE_BYTES / 3) * 4) {
    throw new Error('Choose a smaller reference image (up to 1 MB).');
  }
}

interface BriefStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
}

type StoredBrief = Omit<PlanningBrief, 'reference_image'> & { reference_key: string };

/** Separate from legacy seeded projects until analysis produces a confirmed plan. */
export class PlanningBriefRepository {
  private writes = new Map<string, Promise<unknown>>();
  private storage: BriefStorage;

  constructor(storage: BriefStorage) { this.storage = storage; }

  private key(account: string): string {
    if (!account.trim()) throw new Error('Sign in to save a project brief.');
    return `@forgemind:planning-briefs:v1:${account.trim().toLowerCase()}`;
  }

  private async records(account: string): Promise<StoredBrief[]> {
    const key = this.key(account);
    const raw = await this.storage.getItem(key);
    if (!raw) return [];
    // Fail visibly on an unknown/corrupt format; never replace it with an empty list.
    const stored = JSON.parse(raw);
    if (stored.version !== 1 || !Array.isArray(stored.briefs)) {
      throw new Error('Saved project briefs could not be read.');
    }
    const ids = new Set<string>();
    for (const brief of stored.briefs) {
      if (!brief || typeof brief.brief_id !== 'string' || !brief.brief_id || ids.has(brief.brief_id) ||
          brief.status !== 'brief' || typeof brief.created_at !== 'string' ||
          typeof brief.updated_at !== 'string' || typeof brief.character_name !== 'string' ||
          typeof brief.reference_key !== 'string' || !brief.reference_key.startsWith(`${key}:image:`) ||
          typeof brief.target_date !== 'string') {
        throw new Error('Saved project briefs could not be read.');
      }
      validateBriefFields(brief);
      ids.add(brief.brief_id);
    }
    return [...stored.briefs].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async list(account: string): Promise<PlanningBrief[]> {
    const records = await this.records(account);
    return Promise.all(records.map(async ({ reference_key, ...brief }) => {
      const reference_image = await this.storage.getItem(reference_key);
      if (!reference_image) throw new Error('A saved reference image could not be read.');
      const result = { ...brief, reference_image };
      validatePlanningBrief(result); // Past deadlines remain readable.
      return result;
    }));
  }

  save(account: string, input: PlanningBriefInput, today: string, existingId?: string): Promise<PlanningBrief> {
    const key = this.key(account);
    // Serialize read-modify-write operations per account so concurrent saves cannot lose a brief.
    const write = (this.writes.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      validatePlanningBrief(input, today);
      const briefs = await this.records(account);
      const previous = existingId ? briefs.find(brief => brief.brief_id === existingId) : undefined;
      if (existingId && !previous) throw new Error('This project brief could not be found.');
      const now = new Date().toISOString();
      const brief: PlanningBrief = {
        ...input,
        character_name: input.character_name.trim(),
        brief_id: previous?.brief_id ?? `brief-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        status: 'brief',
        created_at: previous?.created_at ?? now,
        updated_at: now,
      };
      const oldImage = previous ? await this.storage.getItem(previous.reference_key) : null;
      const reuseImage = previous && oldImage === input.reference_image;
      const reference_key = reuseImage ? previous.reference_key : `${key}:image:${brief.brief_id}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Images get their own bounded entries; the list remains small on Android.
      // Commit the list last so a failed image write never changes a saved brief.
      if (!reuseImage) await this.storage.setItem(reference_key, input.reference_image);
      const { reference_image: _image, ...fields } = brief;
      try {
        await this.storage.setItem(key, JSON.stringify({
          version: 1,
          briefs: [{ ...fields, reference_key }, ...briefs.filter(candidate => candidate.brief_id !== brief.brief_id)],
        }));
      } catch (error) {
        if (!reuseImage) await this.storage.removeItem?.(reference_key).catch(() => undefined);
        throw error;
      }
      if (previous && !reuseImage) await this.storage.removeItem?.(previous.reference_key).catch(() => undefined);
      return brief;
    });
    this.writes.set(key, write);
    return write.finally(() => {
      if (this.writes.get(key) === write) this.writes.delete(key);
    });
  }
}
