/**
 * ForgeMind - Mock Catalog Helpers (FE-5)
 * Deterministic-ish mocks for AI categorization + transcription.
 * Real image classification and speech-to-text are BE-1 backend features.
 */

import { AttireCategory } from '../types/owned-attire';

const TYPE_KEYWORDS: { keywords: string[]; type: AttireCategory }[] = [
  { keywords: ['wig', 'hair', 'spiky', 'hairpiece'], type: 'wig' },
  { keywords: ['boot', 'shoe', 'sneaker', 'sandal', 'footwear'], type: 'footwear' },
  { keywords: ['fabric', 'cloth', 'meter', 'roll'], type: 'fabric' },
  { keywords: ['armor', 'plate', 'pauldron', 'chestpiece'], type: 'armor' },
  { keywords: ['sword', 'weapon', 'knife', 'katana', 'blade'], type: 'weapon' },
  { keywords: ['prop', 'shield', 'staff', 'wand'], type: 'prop' },
  { keywords: ['accessory', 'necklace', 'ring', 'glove', 'belt', 'bag'], type: 'accessory' },
  { keywords: ['dress', 'jacket', 'shirt', 'coat', 'blazer', 'uniform', 'suit', 'skirt', 'pants', 'costume'], type: 'clothing' },
  { keywords: ['foam', 'eva', 'plastic', 'glue', 'resin'], type: 'material' },
];

const COLOR_KEYWORDS: { keywords: string[]; color: string }[] = [
  { keywords: ['white', 'silver'], color: 'white' },
  { keywords: ['black', 'dark'], color: 'black' },
  { keywords: ['red', 'maroon', 'scarlet'], color: 'red' },
  { keywords: ['blue', 'navy'], color: 'blue' },
  { keywords: ['pink', 'rose'], color: 'pink' },
  { keywords: ['brown', 'tan', 'leather'], color: 'brown' },
  { keywords: ['green', 'olive'], color: 'green' },
  { keywords: ['purple', 'violet'], color: 'purple' },
  { keywords: ['yellow', 'gold'], color: 'yellow' },
];

const MOCK_STYLE_POOL = [
  'anime-inspired costume piece',
  'casual everyday wear',
  'formal dress piece',
  'streetwear accessory',
  'handcrafted prop-like item',
  'replica uniform piece',
];

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export interface MockCategorization {
  auto_categorized_type: AttireCategory;
  auto_categorized_color: string;
  auto_categorized_style: string;
}

export const mockCategorizationFromText = (text: string): MockCategorization => {
  const lower = text.toLowerCase();

  const typeMatch = TYPE_KEYWORDS.find((entry) =>
    entry.keywords.some((k) => lower.includes(k))
  );
  const colorMatch = COLOR_KEYWORDS.find((entry) =>
    entry.keywords.some((k) => lower.includes(k))
  );

  return {
    auto_categorized_type: typeMatch?.type ?? 'other',
    auto_categorized_color: colorMatch?.color ?? 'unclear',
    auto_categorized_style: pickRandom(MOCK_STYLE_POOL),
  };
};

export const MOCK_RANDOM_TYPES: AttireCategory[] = [
  'wig',
  'clothing',
  'footwear',
  'accessory',
  'armor',
  'weapon',
  'prop',
  'fabric',
  'material',
  'other',
];

export const MOCK_RANDOM_COLORS = ['black', 'white', 'red', 'blue', 'pink', 'brown', 'green', 'purple'];

export const MOCK_RANDOM_STYLES = MOCK_STYLE_POOL;

export const mockTranscription = (language: 'english' | 'taglish'): string => {
  if (language === 'taglish') {
    return 'red na jacket na magaan, pwedeng pang casual o costume lining';
  }
  return 'a red lightweight jacket that works for casual wear or costume lining';
};

export const mockPhotoCategorization = (): MockCategorization => ({
  auto_categorized_type: pickRandom(MOCK_RANDOM_TYPES),
  auto_categorized_color: pickRandom(MOCK_RANDOM_COLORS),
  auto_categorized_style: pickRandom(MOCK_RANDOM_STYLES),
});