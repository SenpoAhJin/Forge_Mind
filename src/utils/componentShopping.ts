import palette from '../data/outfitPalette.json' with { type: 'json' };
import keywords from '../data/outfitKeywords.json' with { type: 'json' };
import type { ReferenceReview } from '../types/referenceExtraction';
import { componentLabel, confirmedComponents, SLOT_LABELS } from './componentPlanning';
import { MATERIAL_FACTORS, priceRange } from './componentBudget';

export function shoppingTerms(review: ReferenceReview | null) {
  return confirmedComponents(review).filter(component => component.value.plan !== 'own').map(component => {
    const value = component.value;
    const color = palette.colors.find(color => color.hex.toLowerCase() === value.colors[0]?.toLowerCase())?.name.toLowerCase() ?? 'unspecified color';
    const vocabulary = value.type === 'accessory' ? [] : keywords.keywords[value.type];
    const style = vocabulary.includes(value.style) ? value.style.replace(/-/g, ' ') : '';
    const material = value.material.trim().toLowerCase();
    const knownMaterial = Object.hasOwn(MATERIAL_FACTORS, material) ? material : 'unspecified material';
    return { componentId: component.id, label: componentLabel(component), plan: value.plan,
      phrase: [color, style, SLOT_LABELS[value.type].toLowerCase(), 'cosplay'].filter(Boolean).join(' '),
      spec: `${color} · ${style || 'unspecified style'} · ${knownMaterial}`, range: priceRange(component),
      materialFallback: !!material && !Object.hasOwn(MATERIAL_FACTORS, material) };
  });
}
