import type { ReferenceReview } from '../types/referenceExtraction';
import { getSlotDefinitions, getSlotDefaultColor, getSlotDefaultStyles } from './outfitStore';

/** Transient display descriptors only; never an outfit or inventory record. */
export function targetLook(review: ReferenceReview | null) {
  if (!review?.confirmed) return [];
  return getSlotDefinitions().flatMap(slot => {
    const component = review.components.find(c => c.value.type === slot.id);
    if (!component) return [];
    const style = getSlotDefaultStyles(slot.id);
    const word = component.value.style;
    let mapped = !word;
    if (slot.id === 'top') {
      const sleeve = ({ sleeveless: 'none', 'tank-top': 'none', 'short-sleeve': 'short', 'long-sleeve': 'long' } as Record<string, string>)[word];
      if (sleeve) { style.sleeve = sleeve; mapped = true; }
    }
    if (slot.id === 'bottom') {
      if (word === 'shorts') { style.length = 'shorts'; mapped = true; }
      if (word === 'skirt') { style.shape = 'skirt'; mapped = true; }
      if (['pants', 'jeans', 'trousers', 'leggings', 'tights'].includes(word)) mapped = true;
    }
    return [{ id: slot.id, label: slot.label, componentId: component.id,
      color: component.value.colors[0] ?? getSlotDefaultColor(slot.id), style,
      description: `${component.value.colors.join(', ') || 'No target color'} · ${word || 'Default shape'}`,
      note: word && !mapped ? `${word}: default 3D shape used.` : '',
      plan: component.value.plan, band: component.originalAI?.band ?? 'low' }];
  });
}
