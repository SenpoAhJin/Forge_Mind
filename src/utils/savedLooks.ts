import type { OutfitState } from './outfitStore';

export type LookPieces = OutfitState['pieces'];
export interface SavedLook { id: string; name: string; pieces: LookPieces }
const clone = (pieces: LookPieces): LookPieces => JSON.parse(JSON.stringify(pieces));
export function recordWornChange(previous: OutfitState, next: OutfitState): OutfitState {
  if (JSON.stringify(previous.pieces) === JSON.stringify(next.pieces)) return next;
  return { ...next, history: [...(previous.history ?? []), clone(previous.pieces)].slice(-20) };
}
export function saveNamedLook(outfit: OutfitState, name: string, id: string): OutfitState {
  if (!name.trim()) throw new Error('Enter a look name.');
  if ((outfit.savedLooks ?? []).some(look => look.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('Choose a different look name.');
  return { ...outfit, savedLooks: [...(outfit.savedLooks ?? []), { id, name: name.trim(), pieces: clone(outfit.pieces) }] };
}
export function switchLook(outfit: OutfitState, id: string): OutfitState {
  const look = outfit.savedLooks?.find(look => look.id === id);
  if (!look) throw new Error('Saved look not found.');
  return recordWornChange(outfit, { ...outfit, pieces: clone(look.pieces) });
}
export function undoLook(outfit: OutfitState): OutfitState {
  const history = outfit.history ?? [];
  if (!history.length) throw new Error('No changes to undo.');
  return { ...outfit, pieces: clone(history[history.length - 1]), history: history.slice(0, -1) };
}
export function compareLooks(outfit: OutfitState, ownedIds: Set<string>, missingSlot?: string) {
  const slots = ['wig', 'top', 'bottom', 'gloves', 'shoes'];
  const filled = slots.filter(slot => outfit.pieces[slot]?.on && ownedIds.has(outfit.pieces[slot]?.itemId ?? ''));
  const a = filled.length;
  const b = a + (missingSlot && slots.includes(missingSlot) && !filled.includes(missingSlot) ? 1 : 0);
  return { a: { count: a, percent: a * 20 }, b: { count: b, percent: b * 20 } };
}
