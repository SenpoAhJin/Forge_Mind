/**
 * WEAR-2: Slot membership constants
 * 
 * Defines which slots are shown in 3D vs not shown yet.
 * Used by both the UI and the "About the 3D preview" explainer.
 */

/** Slots shown in 3D rendering */
import definitions from '../data/costumePieces.json';
export const SHOWN_IN_3D_SLOTS = definitions.pieces.filter(piece => !('supported' in piece) || piece.supported !== false).map(piece => piece.label ?? piece.id);

/** Slots not shown in 3D yet */
export const NOT_SHOWN_YET_SLOTS = definitions.notShownYet;

/** All slots (for completeness checks) */
export const ALL_SLOTS = [...SHOWN_IN_3D_SLOTS, ...NOT_SHOWN_YET_SLOTS] as const;
