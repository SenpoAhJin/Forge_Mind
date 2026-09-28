/**
 * ForgeMind - Body type (3D preview silhouette) constants
 *
 * WHY THIS FILE EXISTS (FE-3D Milestone 1c)
 * ------------------------------------------
 * The 3D preview picks one of two base-body rigs. That choice is a *silhouette /
 * body-type* decision for rendering purposes. It is NOT a question about the user's
 * gender, and it must never be presented as one anywhere in this app.
 *
 * People in the cosplay community do not all want their body representation tied to
 * a gender identity question, so there is deliberately:
 *   - no "gender" field in registration, profile, or onboarding
 *   - no gender question anywhere in the app
 * The only place this is chosen is the selector inside the 3D Preview itself.
 *
 * LABELS - "Male" / "Female"
 * These labels refer to the body shape/silhouette for 3D rendering purposes only.
 * They are bound to the asset filenames and make it clear what body type will be
 * rendered, without making this a gender identity question.
 *
 * INTERNAL VALUES
 * ---------------
 * The stored values stay `'male' | 'female'` because they are bound to the shipped
 * asset filenames (`3D_Model_Male.glb` / `3D_Model_Female.glb`) and to the persisted
 * `User.base_body_selection` column. Renaming the stored values is a schema +
 * data-migration change (and would orphan every already-saved account), which is
 * deliberately out of scope for 1c. The values are never shown to a user; only
 * `BODY_TYPE_OPTIONS[].label` is.
 */

/**
 * The internal stored values. Kept aligned with the asset filenames and the
 * persisted `User.base_body_selection` column - see note above.
 * The 3D components (`BodyModel`, `Preview3D`, `ThreeDPreview`) all take a
 * `bodyType` prop typed as this union — the word "gender" does not appear in the
 * 3D rendering code at all.
 */
export type BaseBodySelection = 'male' | 'female';

export interface BodyTypeOption {
  value: BaseBodySelection;
  /** User-facing copy. PLACEHOLDER - see the warning at the top of this file. */
  label: string;
}

/**
 * The two selectable body types, in display order.
 * Updated to use "Male" / "Female" labels for clarity.
 */
export const BODY_TYPE_OPTIONS: BodyTypeOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

/**
 * Technical default used only until a choice is made, so the preview always has
 * something to render on first view. Deliberately NOT presented as a recommendation
 * - the selector is always visible so an unset preference is a one-tap fix.
 */
export const DEFAULT_BASE_BODY: BaseBodySelection = 'male';

/** Resolve the user-facing label for a stored value. */
export function bodyTypeLabel(value: BaseBodySelection | null | undefined): string {
  return (
    BODY_TYPE_OPTIONS.find((o) => o.value === value)?.label ??
    BODY_TYPE_OPTIONS[0].label
  );
}

/**
 * Copy shown next to every body-type selector.
 */
export const BODY_TYPE_SELECTOR_CAPTION =
  'Choose your base body for 3D preview. You can change this anytime.';
