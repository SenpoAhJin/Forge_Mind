import type { OutfitConfidence } from './extractedOutfit';
export type ComponentType = 'wig' | 'top' | 'gloves' | 'bottom' | 'shoes' | 'accessory';
export interface ReferenceColor { hex: string; share: number; palette_id: string }
export interface AIComponent {
  type: ComponentType;
  zone: [number, number, number, number];
  colors: ReferenceColor[];
  style: string | null;
  candidates: { label: string; score: number }[];
  band: OutfitConfidence;
  warnings: string[];
}
export interface ReferenceResult {
  schema_version: 1;
  image: { width: number; height: number };
  method: 'pose' | 'fallback';
  mode: 'full';
  components: AIComponent[];
  warnings: string[];
}
export interface ComponentValue {
  type: ComponentType;
  name: string;
  colors: string[];
  style: string;
  material: string;
  notes: string;
  plan: 'own' | 'buy' | 'make';
}
export interface ReviewedComponent {
  id: string;
  originalAI: AIComponent | null;
  value: ComponentValue;
  source: 'auto' | 'user';
  userCorrections: { at: string; previous: ComponentValue; value: ComponentValue }[];
}
export interface ReferenceReview {
  version: 1;
  briefId: string;
  referenceImage: string;
  confirmed: boolean;
  result: ReferenceResult | null;
  components: ReviewedComponent[];
  deletedComponents: ReviewedComponent[];
}
