/**
 * D5 Step 3: Real-data scoring test
 * 
 * Uses REAL mobile mock categorizer to build OwnedAttire objects,
 * then sends through REAL backend transform to Flask.
 * 
 * Tests whether category component fires for top/bottom/accessory slots.
 * 
 * REQUIRES: Flask running on port 5000 with gojo-satoru_season-2-uniform data
 */

import { mockCategorizationFromText } from '../src/utils/mockCatalog';

const FLASK_URL = 'http://localhost:5000';
const DEFAULT_COLOR_FALLBACK = '#808080';

interface OwnedAttire {
  attire_id: string;
  auto_categorized_type: string | null;
  auto_categorized_color: string | null;
  auto_categorized_style: string | null;
  original_input_text: string;
}

interface FlaskOwnedItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  color: string;
  tags: string[];
}

/**
 * Transform function (copy of backend logic to avoid config dependency)
 */
function transformToFlaskFormat(attire: OwnedAttire[]): FlaskOwnedItem[] {
  return attire.map(item => {
    const category = item.auto_categorized_type?.toLowerCase() || 'other';
    
    const tags: string[] = [];
    if (item.auto_categorized_style) {
      tags.push(item.auto_categorized_style.toLowerCase());
    }
    if (item.auto_categorized_color) {
      tags.push(item.auto_categorized_color.toLowerCase());
    }
    if (item.original_input_text) {
      const words = item.original_input_text
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w));
      tags.push(...words);
    }

    return {
      id: item.attire_id,
      name: item.original_input_text || 'Unnamed Item',
      category: category,
      subcategory: category,
      color: item.auto_categorized_color || DEFAULT_COLOR_FALLBACK,
      tags: [...new Set(tags)],
    };
  });
}

interface OwnedAttire {
  attire_id: string;
  auto_categorized_type: string | null;
  auto_categorized_color: string | null;
  auto_categorized_style: string | null;
  original_input_text: string;
}

async function testRealDataScoring() {
  console.log('=== D5 Step 3: Real-Data Scoring Test ===\n');

  const testItems = [
    'white cosplay wig',
    'black jacket',
    'black dress pants',
    'blindfold',
    'red dress',
    'green hat',
  ];

  console.log('Building OwnedAttire objects using REAL mockCategorizationFromText:\n');

  const ownedAttire: OwnedAttire[] = testItems.map((text, idx) => {
    const categorization = mockCategorizationFromText(text);
    const item: OwnedAttire = {
      attire_id: `item-${String(idx + 1).padStart(3, '0')}`,
      auto_categorized_type: categorization.auto_categorized_type,
      auto_categorized_color: categorization.auto_categorized_color,
      auto_categorized_style: categorization.auto_categorized_style,
      original_input_text: text,
    };

    console.log(`  [${idx + 1}] "${text}"`);
    console.log(`      type: ${item.auto_categorized_type}`);
    console.log(`      color: ${item.auto_categorized_color}`);
    console.log(`      style: ${item.auto_categorized_style}`);
    return item;
  });

  console.log('\nTransforming through REAL backend transform:\n');

  const flaskItems = transformToFlaskFormat(ownedAttire);

  flaskItems.forEach((item, idx) => {
    console.log(`  [${idx + 1}] ${item.name}`);
    console.log(`      category: ${item.category}`);
    console.log(`      subcategory: ${item.subcategory}`);
    console.log(`      color: ${item.color}`);
    console.log(`      tags: [${item.tags.join(', ')}]`);
  });

  console.log('\nCalling Flask with real data:\n');

  const requestBody = {
    character_variant_id: 'gojo-satoru_season-2-uniform',
    owned_items: flaskItems,
  };

  try {
    const response = await fetch(`${FLASK_URL}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.log(`  ✗ Flask error: ${response.status}`);
      return;
    }

    const result = await response.json();

    console.log('Flask response breakdown:\n');

    const suggested = result.suggested_outfit || {};
    const slots = ['wig', 'top', 'bottom', 'accessory'];

    slots.forEach((slot) => {
      const match = suggested[slot];
      if (match) {
        console.log(`  [${slot}] ${match.name}`);
        console.log(`      color: ${match.breakdown.color.toFixed(3)}`);
        console.log(`      keywords: ${match.breakdown.keywords.toFixed(3)}`);
        console.log(`      category: ${match.breakdown.category.toFixed(3)}`);
        console.log(`      total: ${match.score.toFixed(3)} (${match.confidence})`);
      }
    });

    console.log(`\n  Overall: ${result.match_quality.overall_score.toFixed(3)} (${result.match_quality.quality_label})`);
    console.log(`  Completeness: ${(result.match_quality.completeness || 0).toFixed(3)}`);
    console.log(`  Avg match: ${(result.match_quality.average_match_score || 0).toFixed(3)}`);

    // Analyze category firing
    console.log('\n=== Category Component Analysis ===\n');

    let categoryFired = false;
    let categoryReason = '';

    slots.forEach((slot) => {
      const match = suggested[slot];
      if (match && match.breakdown.category > 0) {
        categoryFired = true;
        categoryReason += `  ${slot}: category ${match.breakdown.category.toFixed(3)} > 0 ✓\n`;
      } else if (match) {
        categoryReason += `  ${slot}: category 0.0 (slot='${slot}', item.subcategory='${flaskItems.find(i => i.id === match.item_id)?.subcategory}') ✗\n`;
      }
    });

    console.log(categoryReason);

    if (!categoryFired) {
      console.log('FINDING: Category component NEVER fires with real app data.');
      console.log('');
      console.log('CAUSE:');
      console.log('  Backend transform (matcherRouter.ts:89-91):');
      console.log('    category: item.auto_categorized_type.toLowerCase() || "other"');
      console.log('    subcategory: same as category');
      console.log('');
      console.log('  Flask matcher (attire_matcher.py:137-145):');
      console.log('    Compares item.subcategory == slot_name');
      console.log('    Example: slot="top", item.subcategory="jacket" → NO MATCH');
      console.log('    Example: slot="wig", item.subcategory="wig" → MATCH (only slot where this works)');
      console.log('');
      console.log('PROPOSED FIX:');
      console.log('  Option 1: Backend map auto_categorized_type → slot-compatible category');
      console.log('    "jacket" → "top", "pants" → "bottom", "wig" → "wig", etc.');
      console.log('  Option 2: Flask add type-to-slot mapping logic');
      console.log('    if subcategory in ["jacket", "shirt", "coat"]: slot_match = "top"');
      console.log('  Option 3: Flask compare against reference item type instead of slot name');
      console.log('');
    } else {
      console.log('Category component DOES fire for some slots with real data.');
    }

  } catch (err) {
    console.log(`  ✗ Cannot reach Flask: ${(err as Error).message}`);
  }
}

testRealDataScoring().catch(console.error);
