/**
 * Single source of truth for "does this account get the organizer screens?".
 *
 * The tab navigator and the Events / Logistics guards used to answer this
 * question from different fields: the navigator looked at `is_organizer` while
 * the guards looked at `organizer_role` + `department_verification_status`.
 * A Head Organizer whose role had been lost in storage therefore saw the
 * organizer tabs (is_organizer true) and a gate message inside them
 * (organizer_role null) — the exact contradiction reported from the phone.
 *
 * Both sides now call these three functions, so the tab bar and the screens
 * underneath it can no longer disagree.
 */

import { DepartmentVerificationStatus } from '../types/organizer';

/**
 * Declared structurally rather than imported from UserContext: the context does
 * not export its `User` interface, and the only fields these checks need are
 * these three. `department_verification_status` is optional on the account, so
 * it stays optional here.
 */
interface OrganizerIdentity {
  is_organizer: boolean;
  organizer_role: 'head' | 'staff' | null;
  department_verification_status?: DepartmentVerificationStatus;
}

type MaybeOrganizer = OrganizerIdentity | null | undefined;

/** organizer_role === 'head'. The top role; also does the Holder's jobs. */
export function isHeadOrganizer(user: MaybeOrganizer): boolean {
  return user?.organizer_role === 'head';
}

/** organizer_role === 'staff' AND department_verification_status === 'approved'. */
export function isApprovedStaff(user: MaybeOrganizer): boolean {
  return (
    user?.organizer_role === 'staff' && user?.department_verification_status === 'approved'
  );
}

/**
 * True when the account may see the contents of Events and Logistics, rather
 * than the "request organizer access" gate.
 *
 * Head Organizers always pass. Staff pass only once a Head has approved their
 * department. Everyone else — pending staff, rejected staff, plain cosplayers —
 * fails and sees the gate.
 */
export function hasOrganizerScreenAccess(user: MaybeOrganizer): boolean {
  return isHeadOrganizer(user) || isApprovedStaff(user);
}

/**
 * True when the account should land in the ORGANIZER tabs rather than the
 * cosplayer tabs.
 *
 * `is_organizer` is still honoured on its own so that a pending or rejected
 * staff member reaches the organizer tabs and sees the gate with its own
 * department's wording, and can get to the Profile tab where the request
 * controls live. A plain cosplayer (is_cosplayer, not is_organizer, no role)
 * never gets here.
 */
export function shouldShowOrganizerTabs(user: MaybeOrganizer): boolean {
  return user?.is_organizer === true || hasOrganizerScreenAccess(user);
}