/**
 * D6 Step 3: Before/After test with real app data
 * Run with Flask on port 5000
 */
import { mockCategorizationFromText } from '../src/utils/mockCatalog';

const FLASK_URL = 'http://localhost:5000';

// OLD transform (before adapters)
function transformOld(items: any[]) {
  return items.map(item => ({
    id: item.attire_id,
    name: item.original_input_text,
    category: item.auto_categorized_type?.toLowerCase() || 'other',
    subcategory: item.auto_categorized_type?.toLowerCase() || 'other',
    color: item.auto_categorized_color || '#808080',
    tags: [item.auto_categorized_style, item.auto_categorized_color, ...item.original_input_text.split(' ')].filter(Boolean)
  }));
}

// NEW transform (with adapters - copy logic)
const COLOR_MAP: Record<string, string> = {
  'white': '#FFFFFF', 'black': '#000000', 'red': '#FF0000', 'blue': '#0000FF',
  'pink': '#FFC0CB', 'brown': '#8B4513', 'green': '#008000', 'purple': '#800080', 'yellow': '#FFFF00'
};

function mapSlot(text: string, type: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('wig') || lower.includes('hair')) return 'wig';
  if (lower.includes('jacket') || lower.includes('coat') || lower.includes('shirt')) return 'top';
  if (lower.includes('pants') || lower.includes('skirt')) return 'bottom';
  if (lower.includes('boot') || lower.includes('shoe')) return 'footwear';
  if (lower.includes('blindfold') || lower.includes('glove') || lower.includes('belt') || lower.includes('hat')) return 'accessory';
  if (type === 'wig') return 'wig';
  if (type === 'footwear') return 'footwear';
  if (type === 'accessory') return 'accessory';
  return type;
}

function transformNew(items: any[]) {
  return items.map(item => {
    const type = item.auto_categorized_type?.toLowerCase() || 'other';
    const slot = mapSlot(item.original_input_text, type);
    const color = COLOR_MAP[item.auto_categorized_color] || '#808080';
    return {
      id: item.attire_id,
      name: item.original_input_text,
      category: slot,
      subcategory: slot,
      color: color,
      tags: [item.auto_categorized_style, item.auto_categorized_color, ...item.original_input_text.split(' ')].filter(Boolean)
    };
  });
}

async function test() {
  const texts = ['white cosplay wig', 'black jacket', 'black dress pants', 'blindfold'];
  const items = texts.map((t, i) => {
    const cat = mockCategorizationFromText(t);
    return { attire_id: `i${i}`, original_input_text: t, ...cat };
  });

  console.log('=== BEFORE (old transform) ===');
  const oldBody = { character_variant_id: 'gojo-satoru_season-2-uniform', owned_items: transformOld(items) };
  const oldRes = await fetch(`${FLASK_URL}/api/match`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(oldBody) });
  const oldData = await oldRes.json();
  console.log('Overall:', oldData.match_quality.overall_score, oldData.match_quality.quality_label);
  Object.keys(oldData.suggested_outfit || {}).forEach(slot => {
    const m = oldData.suggested_outfit[slot];
    console.log(`  ${slot}: ${m.score.toFixed(3)} ${m.confidence} (c:${m.breakdown.color.toFixed(2)} k:${m.breakdown.keywords.toFixed(2)} cat:${m.breakdown.category.toFixed(2)})`);
  });

  console.log('\n=== AFTER (new transform) ===');
  const newBody = { character_variant_id: 'gojo-satoru_season-2-uniform', owned_items: transformNew(items) };
  const newRes = await fetch(`${FLASK_URL}/api/match`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(newBody) });
  const newData = await newRes.json();
  console.log('Overall:', newData.match_quality.overall_score, newData.match_quality.quality_label);
  Object.keys(newData.suggested_outfit || {}).forEach(slot => {
    const m = newData.suggested_outfit[slot];
    console.log(`  ${slot}: ${m.score.toFixed(3)} ${m.confidence} (c:${m.breakdown.color.toFixed(2)} k:${m.breakdown.keywords.toFixed(2)} cat:${m.breakdown.category.toFixed(2)})`);
  });
}

test().catch(console.error);
