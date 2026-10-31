/**
 * WEAR-2: Slot membership constants
 * 
 * Defines which slots are shown in 3D vs not shown yet.
 * Used by both the UI and the "About the 3D preview" explainer.
 */

/** Slots shown in 3D rendering */
export const SHOWN_IN_3D_SLOTS = ['Wig', 'Top', 'Bottom', 'Gloves', 'Shoes'] as const;

/** Slots not shown in 3D yet */
export const NOT_SHOWN_YET_SLOTS = ['Blindfold', 'Ear cuff', 'Prop accessory', 'Belt'] as const;

/** All slots (for completeness checks) */
export const ALL_SLOTS = [...SHOWN_IN_3D_SLOTS, ...NOT_SHOWN_YET_SLOTS] as const;
