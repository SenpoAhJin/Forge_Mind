/**
 * ForgeMind - OwnedAttire Types (FE-5)
 *
 * Mirrors the OwnedAttire table in ForgeMind_Phase0_Foundation.md (v0.2.1).
 * Field names/types are kept identical so the future BE-1 backend can be
 * wired in with zero restructuring.
 */

export type EntryMethod = 'photo' | 'text' | 'voice';

export type EntryLanguage = 'english' | 'taglish';

export type AttireCategory =
  | 'wig'
  | 'clothing'
  | 'footwear'
  | 'accessory'
  | 'armor'
  | 'weapon'
  | 'prop'
  | 'fabric'
  | 'material'
  | 'other';

export type FlexibilityTag = 'restyle-willing' | 'dye-willing' | 'as-is-only';

export type AvailabilityStatus = 'free' | 'committed';

export interface ConditionPhotoHistoryEntry {
  timestamp: string;
  photo_url: string | null;
  condition_rating: number;
}

export interface OwnedAttire {
  attire_id: string;
  user_id: string;
  entry_method: EntryMethod;
  entry_language: EntryLanguage;
  original_input_text: string;
  photo_urls: (string | null)[];
  auto_categorized_type: AttireCategory;
  auto_categorized_color: string;
  auto_categorized_style: string;
  flexibility_tag: FlexibilityTag;
  condition_rating: number;
  condition_photo_history: ConditionPhotoHistoryEntry[];
  availability_status: AvailabilityStatus;
  committed_to_project_id: string | null;
  acquired_date: string;
  acquisition_cost: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface NewOwnedAttireInput {
  entry_method: EntryMethod;
  entry_language: EntryLanguage;
  original_input_text: string;
  photo_urls: (string | null)[];
  auto_categorized_type: AttireCategory;
  auto_categorized_color: string;
  auto_categorized_style: string;
  flexibility_tag: FlexibilityTag;
  condition_rating: number;
  acquired_date: string;
  acquisition_cost: number;
  notes?: string;
}

export interface UpdateOwnedAttireInput {
  auto_categorized_type?: AttireCategory;
  auto_categorized_color?: string;
  auto_categorized_style?: string;
  flexibility_tag?: FlexibilityTag;
  condition_rating?: number;
  acquired_date?: string;
  acquisition_cost?: number;
  notes?: string;
}