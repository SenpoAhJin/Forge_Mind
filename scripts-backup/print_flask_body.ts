/**
 * D6 Step 1a: Print exact JSON body backend sends to Flask for D5 items
 */
import { mockCategorizationFromText } from '../src/utils/mockCatalog';

const DEFAULT_COLOR_FALLBACK = '#808080';

interface OwnedAttire {
  attire_id: string;
  auto_categorized_type: string | null;
  auto_categorized_color: string | null;
  auto_categorized_style: string | null;
  original_input_text: string;
}

function transformToFlaskFormat(attire: OwnedAttire[]) {
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

const testItems = [
  'white cosplay wig',
  'black jacket',
  'black dress pants',
  'blindfold',
  'red dress',
  'green hat',
];

const ownedAttire: OwnedAttire[] = testItems.map((text, idx) => {
  const categorization = mockCategorizationFromText(text);
  return {
    attire_id: `item-${String(idx + 1).padStart(3, '0')}`,
    auto_categorized_type: categorization.auto_categorized_type,
    auto_categorized_color: categorization.auto_categorized_color,
    auto_categorized_style: categorization.auto_categorized_style,
    original_input_text: text,
  };
});

const flaskItems = transformToFlaskFormat(ownedAttire);

console.log(JSON.stringify(flaskItems, null, 2));
