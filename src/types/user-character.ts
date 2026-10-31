/**
 * User Character Types
 * 
 * Characters that users want to cosplay.
 * Users create their own characters instead of using hardcoded database.
 */

import type { ExtractedOutfit } from './extractedOutfit';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Character created by user for cosplay planning
 */
export interface UserCharacter {
  extracted_outfit?: ExtractedOutfit;
  /** Unique identifier */
  id: string;
  
  /** User who created this character */
  user_id: string;
  
  /** Character name (e.g., "Naruto Uzumaki") */
  name: string;
  
  /** Series/Source (e.g., "Naruto Shippuden") */
  series: string;
  
  /** Specific variant (optional, e.g., "Sage Mode") */
  variant?: string;
  
  /** Target colors for this cosplay */
  targetColors: string[];
  
  /** Style tags for matching items */
  styleTags: string[];
  
  /** Reference photo URL (optional) */
  referencePhotoUrl?: string;
  
  /** Estimated difficulty */
  difficulty?: DifficultyLevel;
  
  /** User notes */
  notes?: string;
  
  /** Creation timestamp */
  created_at: string;
  
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Input for creating new character (without id, user_id, timestamps)
 */
export type NewUserCharacterInput = Omit<
  UserCharacter,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

/**
 * Input for updating character (partial)
 */
export type UpdateUserCharacterInput = Partial<
  Omit<UserCharacter, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;
