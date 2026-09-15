/**
 * ForgeMind Catalog Data Access
 * The mock dataset lives in characters.json / variants.json (real-import ready).
 * These accessors centralize lookups so components never walk the JSON directly.
 */

import charactersRaw from './characters.json';
import variantsRaw from './variants.json';
import { Character, Variant } from '../types/catalog';

export const characters: Character[] = charactersRaw as Character[];
export const variants: Variant[] = variantsRaw as Variant[];

export const getCharacterById = (characterId: string): Character | undefined =>
  characters.find((c) => c.character_id === characterId);

export const getVariantsByCharacterId = (characterId: string): Variant[] =>
  variants.filter((v) => v.character_id === characterId);

export const getVariantById = (variantId: string): Variant | undefined =>
  variants.find((v) => v.variant_id === variantId);

export const searchCharacters = (query: string): Character[] => {
  const q = query.trim().toLowerCase();
  if (!q) return characters;
  return characters.filter(
    (c) =>
      c.character_name.toLowerCase().includes(q) ||
      c.source_media.toLowerCase().includes(q)
  );
};