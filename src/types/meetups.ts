/**
 * FE-7 Step 5: Group Meetup Types
 *
 * A Meetup is a cosplayer-proposed coordination point (group photo-op, queue
 * slot, etc.) for a CONFIRMED event. Cosplayers can only see/propose/RSVP to
 * meetups on events their own project is linked to (Project.linked_event_id).
 *
 * There is no backend yet: persisted via MeetupsContext on AsyncStorage, matching
 * the other FE-7 contexts.
 */

export type RsvpStatus = 'going' | 'maybe' | 'declined';

export const RSVP_STATUSES: RsvpStatus[] = ['going', 'maybe', 'declined'];

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  going: 'Going',
  maybe: 'Maybe',
  declined: 'Declined',
};

export interface MeetupRsvp {
  cosplayer_email: string;
  cosplayer_name: string;
  status: RsvpStatus;
  responded_at: string;
}

export interface Meetup {
  meetup_id: string;
  event_id: string;
  proposed_by_email: string;
  proposed_by_name: string;
  title: string;
  purpose?: string | null;
  proposed_date: string; // YYYY-MM-DD
  proposed_time: string; // HH:MM, 24-hour
  proposed_location: string;
  rsvps: MeetupRsvp[];
  created_at: string;
  updated_at: string;
}

export interface RsvpHeadcount {
  going: number;
  maybe: number;
  declined: number;
  total: number;
}

/**
 * Headcount per status for a meetup. Recomputed on every render from the RSVP
 * list so participation changes are reflected immediately.
 */
export const getRsvpHeadcount = (meetup: Meetup): RsvpHeadcount => {
  const headcount: RsvpHeadcount = { going: 0, maybe: 0, declined: 0, total: 0 };

  for (const rsvp of meetup.rsvps) {
    headcount[rsvp.status] += 1;
    headcount.total += 1;
  }

  return headcount;
};

/**
 * The current user's own RSVP for a meetup, or null if they have not responded.
 */
export const getOwnRsvp = (meetup: Meetup, email: string): MeetupRsvp | null =>
  meetup.rsvps.find((rsvp) => rsvp.cosplayer_email === email) ?? null;
