/**
 * ForgeMind Catalog Types
 * Mirrors the Character and Variant schemas from ForgeMind_Phase0_Foundation.md (v0.2.1).
 * Field names/types are kept identical to the spec so a real dataset (CSV/JSON dump)
 * can be swapped in without renaming.
 */

export type MediaType = 'anime' | 'manga' | 'game' | 'movie' | 'original' | 'other';

export type OriginTag = 'canon' | 'fan-art-inspired' | 'user-original';

export interface Character {
  character_id: string;
  character_name: string;
  source_media: string;
  media_type: MediaType;
  description?: string;
  reference_image_url?: string;
  created_by_user_id: string;
  created_at: string;
  is_confirmed: boolean;
}

export interface Variant {
  variant_id: string;
  character_id: string;
  variant_name: string;
  origin_tag: OriginTag;
  origin_description?: string;
  build_difficulty_rating?: number;
  reference_image_urls?: string[];
  status: 'confirmed' | 'candidate';
  candidate_source?: 'ai-flagged' | 'user-submitted' | null;
  confirmed_by_user_id?: string | null;
  confirmed_at?: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}