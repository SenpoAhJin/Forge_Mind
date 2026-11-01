import type { AIComponent, ComponentType, ComponentValue, ReferenceResult, ReferenceReview, ReviewedComponent } from '../types/referenceExtraction';
import type { ExtractedOutfit, OutfitSlot } from '../types/extractedOutfit';
import keywords from '../data/outfitKeywords.json' with { type: 'json' };
import palette from '../data/outfitPalette.json' with { type: 'json' };

export const componentTypes: ComponentType[] = ['wig', 'top', 'gloves', 'bottom', 'shoes', 'accessory'];
export const stylesFor = (type: ComponentType): string[] => type === 'accessory' ? [] : keywords.keywords[type];
export function validateResult(result: ReferenceResult): void {
  if (!result || result.schema_version !== 1 || result.mode !== 'full' || !['pose', 'fallback'].includes(result.method) ||
      !result.image || !Number.isFinite(result.image.width) || result.image.width <= 0 || !Number.isFinite(result.image.height) || result.image.height <= 0 ||
      !Array.isArray(result.components) || result.components.length !== 6 || !Array.isArray(result.warnings)) throw new Error('Unreadable analysis response.');
  if (new Set(result.components.map(c => c.type)).size !== 6) throw new Error('Analysis must contain six component types.');
  for (const c of result.components) {
    if (!componentTypes.includes(c.type) || !Array.isArray(c.zone) || c.zone.length !== 4 || c.zone.some(v => !Number.isFinite(v) || v < 0 || v > 1) ||
        c.zone[0] >= c.zone[2] || c.zone[1] >= c.zone[3] || !Array.isArray(c.colors) || c.colors.length > 3 ||
        c.colors.some(v => !/^#[0-9a-f]{6}$/i.test(v.hex) || !Number.isFinite(v.share) || v.share < 0 || v.share > 1 || !palette.colors.some(p => p.id === v.palette_id)) ||
        !['low', 'medium', 'high'].includes(c.band) || result.method === 'fallback' && c.band !== 'low' ||
        !Array.isArray(c.warnings) || !Array.isArray(c.candidates) || c.candidates.some(v => !stylesFor(c.type).includes(v.label) || !Number.isFinite(v.score)) ||
        c.style !== null && !stylesFor(c.type).includes(c.style)) throw new Error('Unreadable component in analysis response.');
  }
}
export function newComponent(type: ComponentType, ai: AIComponent | null = null): ReviewedComponent {
  return { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`, originalAI: ai, source: ai ? 'auto' : 'user', userCorrections: [],
    value: { type, name: type, colors: ai?.colors.map(c => c.hex) ?? [], style: ai?.style ?? '', material: '', notes: '', plan: 'buy' } };
}
export function newReview(briefId: string, referenceImage: string, result: ReferenceResult | null): ReferenceReview {
  if (result) validateResult(result);
  return { version: 1, briefId, referenceImage, result, confirmed: false, components: result?.components.map(c => newComponent(c.type, c)) ?? [], deletedComponents: [] };
}
export function correctComponent(component: ReviewedComponent, value: ComponentValue): ReviewedComponent {
  const clone = (input: ComponentValue): ComponentValue => ({ ...input, colors: [...input.colors] });
  return { ...component, value: clone(value), source: 'user', userCorrections: [...component.userCorrections, { at: new Date().toISOString(), previous: clone(component.value), value: clone(value) }] };
}
function validateValue(value: ComponentValue): void {
  if (!value || !componentTypes.includes(value.type) || typeof value.name !== 'string' || !value.name.trim() || !Array.isArray(value.colors) ||
      value.colors.some(c => !/^#[0-9a-f]{6}$/i.test(c)) || typeof value.style !== 'string' || value.style && !stylesFor(value.type).includes(value.style) ||
      typeof value.material !== 'string' || typeof value.notes !== 'string' || !['own', 'buy', 'make'].includes(value.plan)) throw new Error('Component values could not be read.');
}
export function validateReview(review: ReferenceReview, briefId: string): void {
  if (!review || review.version !== 1 || review.briefId !== briefId || typeof review.referenceImage !== 'string' || typeof review.confirmed !== 'boolean' ||
      !Array.isArray(review.components) || !Array.isArray(review.deletedComponents)) throw new Error('Saved components could not be read.');
  if (review.result) validateResult(review.result);
  const ids = new Set<string>();
  for (const c of [...review.components, ...review.deletedComponents]) {
    if (!c || typeof c.id !== 'string' || ids.has(c.id) || !['auto', 'user'].includes(c.source) || !Array.isArray(c.userCorrections)) throw new Error('Saved components could not be read.');
    ids.add(c.id); validateValue(c.value);
    if (c.source === 'auto' && !c.originalAI || c.originalAI && (!review.result || !review.result.components.some(ai => JSON.stringify(ai) === JSON.stringify(c.originalAI)))) {
      throw new Error('Original analysis values could not be read.');
    }
    for (const edit of c.userCorrections) {
      if (typeof edit.at !== 'string' || !Number.isFinite(Date.parse(edit.at))) throw new Error('Component edit history could not be read.');
      validateValue(edit.previous); validateValue(edit.value);
    }
  }
}
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export class ReferenceReviewRepository {
  private listeners = new Set<() => void>();
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private writes = new Map<string, Promise<unknown>>();
  private storage: Storage;
  constructor(storage: Storage) { this.storage = storage; }
  private key(account: string, briefId: string) {
    if (!account.trim() || !briefId) throw new Error('Sign in and select a saved brief.');
    return `@forgemind:reference:v1:${encodeURIComponent(account.trim().toLowerCase())}:${encodeURIComponent(briefId)}`;
  }
  async load(account: string, briefId: string): Promise<ReferenceReview | null> {
    const raw = await this.storage.getItem(this.key(account, briefId));
    if (raw === null) return null;
    const value = JSON.parse(raw); validateReview(value, briefId); return value;
  }
  save(account: string, review: ReferenceReview): Promise<void> {
    const key = this.key(account, review.briefId);
    validateReview(review, review.briefId);
    const snapshot = JSON.stringify(review);
    const write = (this.writes.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      await this.load(account, review.briefId); // Never replace unreadable data.
      await this.storage.setItem(key, snapshot);
      this.listeners.forEach(listener => listener());
    });
    this.writes.set(key, write);
    return write.finally(() => { if (this.writes.get(key) === write) this.writes.delete(key); });
  }
}
export function reviewTargets(review: ReferenceReview): ExtractedOutfit {
  const slots = Object.fromEntries(['wig', 'top', 'gloves', 'bottom', 'shoes'].map(type => {
    const values = review.confirmed ? review.components.filter(c => c.value.type === type) : [];
    const first = values[0];
    return [type, { present: !!first, color: first?.value.colors[0] ?? null, keywords: first?.value.style ? [first.value.style] : [], confidence: first?.originalAI?.band ?? 'low' }];
  })) as ExtractedOutfit['slots'];
  return { version: '1.0.0', slots, unmapped: review.components.filter(c => c.value.type === 'accessory').map(c => c.value.name) };
}
export function targetColorsBySlot(review: ReferenceReview): Partial<Record<OutfitSlot, string[]>> {
  if (!review.confirmed) return {};
  return Object.fromEntries(['wig', 'top', 'gloves', 'bottom', 'shoes'].map(type => [type, [...new Set(review.components.filter(c => c.value.type === type).flatMap(c => c.value.colors))]]));
}
