/**
 * Invite-based Meetups
 * Separate from event-based meetups (MeetupsContext)
 * 
 * This is for casual meetups created via invite codes + QR codes.
 * Anyone with the code can join (no project/event linkage required).
 * Use cases: photoshoot meetups, dinner groups, casual hangouts.
 * 
 * NOT for: event-coordinated meetups (use MeetupsContext for that).
 */

export interface InviteMeetup {
  id: string;
  title: string;
  description: string | null;
  location: string; // Free text (e.g., "Food court near Hall B")
  meetup_date: string; // YYYY-MM-DD
  meetup_time: string; // HH:MM (24-hour)
  created_by_email: string;
  created_by_name: string; // Snapshot at creation
  invite_code: string; // 6-8 uppercase alphanumeric, unique
  created_at: string; // ISO timestamp
}

export interface InviteMeetupParticipant {
  participant_email: string;
  participant_name: string; // Snapshot at join time
  joined_at: string; // ISO timestamp
}

/**
 * Participants stored as sub-array on InviteMeetup.
 * Simpler than separate keyed array since invite meetups are lightweight
 * and participant counts expected to be small (typically < 20).
 */
export interface InviteMeetupWithParticipants extends InviteMeetup {
  participants: InviteMeetupParticipant[];
}
