/**
 * ForgeMind - Chat Types (Server Integration)
 * 
 * Server screens messages at send-time with rule-based word filter (no AI).
 * Chat content is not stored for analysis.
 * 
 * One thread per (listing_id, buyer_user_id) pair.
 * Text only: no attachments, images, price/offer fields, or edit/delete.
 * 
 * Identity: user_id (not email). Server never returns emails.
 */

// Re-export server types as canonical chat types
export type {
  ServerThread as ChatThread,
  ServerMessage as ChatMessage,
} from '../services/ChatApi';

// Status and reason enums for type safety
export type ThreadStatus = 'open' | 'closed';

export type ThreadClosedReason = 
  | 'closed_by_participant'
  | 'listing_unavailable';
