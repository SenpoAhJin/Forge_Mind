/**
 * App-wide notification system
 * 
 * Displays user-facing error messages, warnings, and info notices
 * as pop-ups instead of console warnings.
 * 
 * Usage:
 *   import { showNotice } from '../utils/appNotice';
 *   showNotice('error', 'Something went wrong');
 */

export type NoticeType = 'error' | 'warning' | 'info' | 'success';

export interface Notice {
  id: string;
  type: NoticeType;
  message: string;
  timestamp: number;
}

type NoticeListener = (notice: Notice) => void;

let listeners: NoticeListener[] = [];
let noticeIdCounter = 0;

/**
 * Show a pop-up notice to the user
 */
export function showNotice(type: NoticeType, message: string): void {
  const notice: Notice = {
    id: `notice-${++noticeIdCounter}-${Date.now()}`,
    type,
    message,
    timestamp: Date.now(),
  };

  listeners.forEach((listener) => listener(notice));
}

/**
 * Subscribe to notice events (used by AppNoticeHost)
 */
export function subscribeToNotices(listener: NoticeListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
