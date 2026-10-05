/**
 * ForgeMind - Chat Types (FE-6 Step 4)
 * 
 * Chat content is transaction-scoped and is never screened, classified, scored,
 * or used as input to any AI/rule computation (see spec).
 * 
 * One thread per (listing_id, buyer_email) pair.
 * Text only: no attachments, images, price/offer fields, or edit/delete.
 */

export type ThreadStatus = 'open' | 'closed';

export type ThreadClosedReason = 
  | 'closed_by_participant'
  | 'listing_unavailable';

export interface ChatThread {
  id: string; // thread-<timestamp>-<rand>
  listing_id: string;
  listing_title: string; // Snapshot at creation
  /**
   * The seller's email. The server does not hand out another user's email
   * (privacy rule B1), so this is '' for every listing created from server data
   * and is NOT used for matching. `seller_user_id` is the identity.
   */
  seller_email: string;
  /** The seller's server id. Null until the listing carries one. */
  seller_user_id?: string | null;
  seller_display_name: string; // Snapshot at creation
  buyer_email: string;
  buyer_display_name: string; // Snapshot at creation
  status: ThreadStatus;
  closed_reason?: ThreadClosedReason;
  closed_at?: string; // ISO timestamp
  closed_by_email?: string;
  created_at: string; // ISO timestamp
  last_message_at?: string; // ISO timestamp
  last_message_preview?: string; // First 60 chars
  buyer_last_read_at?: string; // ISO timestamp - unread dot only, no read receipts
  seller_last_read_at?: string; // ISO timestamp
}

export interface ChatMessage {
  id: string; // msg-<timestamp>-<rand>
  thread_id: string;
  sender_email: string;
  body: string; // Trimmed text
  created_at: string; // ISO timestamp
}
