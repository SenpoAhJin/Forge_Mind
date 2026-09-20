/**
 * ForgeMind - Chat Context (FE-6 Step 4)
 *
 * Chat content is transaction-scoped and is never screened, classified, scored,
 * or used as input to any AI/rule computation (see spec).
 *
 * Manages transaction-scoped chat threads (mock data, persisted with AsyncStorage).
 * NO seed threads: threads only exist once created through getOrCreateThread.
 *
 * Context guards:
 *  - getOrCreateThread: listing must exist and be 'active'; buyer must not be the
 *    listing's seller; returns existing thread for that pair if one exists
 *    (even if closed — closed threads are not reopened or duplicated).
 *  - sendMessage: sender must be one of the two participants; thread must be
 *    effectively open; body trimmed must be non-empty and <= 1000 chars.
 *  - closeThread: participants only, open threads only; records
 *    closed_reason 'closed_by_participant', closed_at, closed_by_email.
 *  - Effective status is DERIVED at read time: a stored-open thread whose listing
 *    is no longer 'active' is treated as closed with reason 'listing_unavailable'.
 *  - Accepting an offer does NOT close a thread (no "complete" state exists until
 *    milestone tracking is built).
 *  - getThreadsForUser returns only threads with at least one message.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChatThread,
  ChatMessage,
  ThreadStatus,
  ThreadClosedReason,
} from '../types/chat';
import { useMarketplace } from './MarketplaceContext';

const STORAGE_KEY = '@forgemind:marketplace_chat';

interface ChatData {
  threads: ChatThread[];
  messages: ChatMessage[];
}

type ThreadResult = { success: boolean; error?: string; thread?: ChatThread };
type MessageResult = { success: boolean; error?: string; message?: ChatMessage };

interface ChatContextType {
  threads: ChatThread[];
  isLoading: boolean;
  getOrCreateThread: (listingId: string, buyerEmail: string) => Promise<ThreadResult>;
  getThreadById: (threadId: string) => ChatThread | undefined;
  getThreadsForUser: (email: string) => ChatThread[];
  getMessages: (threadId: string) => ChatMessage[];
  sendMessage: (threadId: string, senderEmail: string, body: string) => Promise<MessageResult>;
  closeThread: (threadId: string, closerEmail: string) => Promise<ThreadResult>;
  markThreadRead: (threadId: string, readerEmail: string) => Promise<void>;
  getUnreadCount: (email: string) => number;
  getEffectiveStatus: (thread: ChatThread) => { status: ThreadStatus; reason?: ThreadClosedReason };
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

// Display names are snapshotted as the email handle
const displayNameFromEmail = (email: string): string => email.split('@')[0];

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getListingById } = useMarketplace();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: ChatData = JSON.parse(stored);
        setThreads(data.threads || []);
        setMessages(data.messages || []);
      } else {
        setThreads([]);
        setMessages([]);
      }
    } catch (error) {
      console.error('[ChatContext] Failed to load chat data:', error);
      setThreads([]);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (updatedThreads: ChatThread[], updatedMessages: ChatMessage[]) => {
    try {
      const data: ChatData = {
        threads: updatedThreads,
        messages: updatedMessages,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setThreads(updatedThreads);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('[ChatContext] Failed to save chat data:', error);
    }
  };

  // Effective status: derived at read time
  const getEffectiveStatus = (thread: ChatThread): { status: ThreadStatus; reason?: ThreadClosedReason } => {
    if (thread.status === 'closed') {
      return { status: 'closed', reason: thread.closed_reason };
    }

    // Check if listing is still active
    const listing = getListingById(thread.listing_id);
    if (!listing || listing.status !== 'active') {
      return { status: 'closed', reason: 'listing_unavailable' };
    }

    return { status: 'open' };
  };

  const getOrCreateThread = async (listingId: string, buyerEmail: string): Promise<ThreadResult> => {
    const listing = getListingById(listingId);
    if (!listing) {
      return { success: false, error: 'That listing no longer exists.' };
    }
    if (listing.status !== 'active') {
      return { success: false, error: 'That listing is no longer accepting messages.' };
    }
    if (listing.seller_email === buyerEmail) {
      return { success: false, error: 'You cannot start a chat on your own listing.' };
    }

    // Check for existing thread (even if closed)
    const existing = threads.find(
      (t) => t.listing_id === listingId && t.buyer_email === buyerEmail
    );
    if (existing) {
      return { success: true, thread: existing };
    }

    // Create new thread
    const timestamp = Date.now();
    const rand = Math.floor(Math.random() * 1000);
    const newThread: ChatThread = {
      id: `thread-${timestamp}-${rand}`,
      listing_id: listingId,
      listing_title: listing.title,
      seller_email: listing.seller_email,
      seller_display_name: displayNameFromEmail(listing.seller_email),
      buyer_email: buyerEmail,
      buyer_display_name: displayNameFromEmail(buyerEmail),
      status: 'open',
      created_at: new Date().toISOString(),
    };

    const updatedThreads = [...threads, newThread];
    await saveData(updatedThreads, messages);
    return { success: true, thread: newThread };
  };

  const getThreadById = (threadId: string): ChatThread | undefined => {
    return threads.find((t) => t.id === threadId);
  };

  const getThreadsForUser = (email: string): ChatThread[] => {
    // Only return threads with at least one message
    const threadsForUser = threads.filter(
      (t) => t.seller_email === email || t.buyer_email === email
    );
    return threadsForUser.filter((t) => {
      const threadMessages = messages.filter((m) => m.thread_id === t.id);
      return threadMessages.length > 0;
    });
  };

  const getMessages = (threadId: string): ChatMessage[] => {
    return messages
      .filter((m) => m.thread_id === threadId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const sendMessage = async (
    threadId: string,
    senderEmail: string,
    body: string
  ): Promise<MessageResult> => {
    const thread = getThreadById(threadId);
    if (!thread) {
      return { success: false, error: 'Thread not found.' };
    }

    // Check participant
    if (thread.seller_email !== senderEmail && thread.buyer_email !== senderEmail) {
      return { success: false, error: 'You are not a participant in this conversation.' };
    }

    // Check effective status
    const effectiveStatus = getEffectiveStatus(thread);
    if (effectiveStatus.status === 'closed') {
      const reason = effectiveStatus.reason === 'listing_unavailable'
        ? 'This listing is no longer available.'
        : 'This conversation is closed.';
      return { success: false, error: reason };
    }

    // Validate body
    const trimmedBody = body.trim();
    if (trimmedBody.length === 0) {
      return { success: false, error: 'Message cannot be empty.' };
    }
    if (trimmedBody.length > 1000) {
      return { success: false, error: 'Message is too long (max 1000 characters).' };
    }

    // Create message
    const timestamp = Date.now();
    const rand = Math.floor(Math.random() * 1000);
    const newMessage: ChatMessage = {
      id: `msg-${timestamp}-${rand}`,
      thread_id: threadId,
      sender_email: senderEmail,
      body: trimmedBody,
      created_at: new Date().toISOString(),
    };

    // Update thread with last message info
    const preview = trimmedBody.slice(0, 60);
    const updatedThreads = threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            last_message_at: newMessage.created_at,
            last_message_preview: preview,
          }
        : t
    );

    const updatedMessages = [...messages, newMessage];
    await saveData(updatedThreads, updatedMessages);
    return { success: true, message: newMessage };
  };

  const closeThread = async (threadId: string, closerEmail: string): Promise<ThreadResult> => {
    const thread = getThreadById(threadId);
    if (!thread) {
      return { success: false, error: 'Thread not found.' };
    }

    // Check participant
    if (thread.seller_email !== closerEmail && thread.buyer_email !== closerEmail) {
      return { success: false, error: 'You are not a participant in this conversation.' };
    }

    // Check if already closed
    if (thread.status === 'closed') {
      return { success: false, error: 'This conversation is already closed.' };
    }

    // Check effective status (listing might be unavailable)
    const effectiveStatus = getEffectiveStatus(thread);
    if (effectiveStatus.status === 'closed' && effectiveStatus.reason === 'listing_unavailable') {
      return { success: false, error: 'This conversation is already effectively closed (listing unavailable).' };
    }

    // Close thread
    const updatedThreads = threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            status: 'closed' as ThreadStatus,
            closed_reason: 'closed_by_participant' as ThreadClosedReason,
            closed_at: new Date().toISOString(),
            closed_by_email: closerEmail,
          }
        : t
    );

    await saveData(updatedThreads, messages);
    const updatedThread = updatedThreads.find((t) => t.id === threadId);
    return { success: true, thread: updatedThread };
  };

  const markThreadRead = async (threadId: string, readerEmail: string): Promise<void> => {
    const thread = getThreadById(threadId);
    if (!thread) return;

    const now = new Date().toISOString();
    const updatedThreads = threads.map((t) => {
      if (t.id !== threadId) return t;
      if (t.buyer_email === readerEmail) {
        return { ...t, buyer_last_read_at: now };
      }
      if (t.seller_email === readerEmail) {
        return { ...t, seller_last_read_at: now };
      }
      return t;
    });

    await saveData(updatedThreads, messages);
  };

  const getUnreadCount = (email: string): number => {
    let count = 0;
    threads.forEach((thread) => {
      if (thread.seller_email !== email && thread.buyer_email !== email) return;
      if (!thread.last_message_at) return;

      const threadMessages = messages.filter((m) => m.thread_id === thread.id);
      if (threadMessages.length === 0) return;

      // Find last message from counterpart
      const lastCounterpartMessage = threadMessages
        .filter((m) => m.sender_email !== email)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (!lastCounterpartMessage) return;

      const lastReadAt =
        thread.buyer_email === email ? thread.buyer_last_read_at : thread.seller_last_read_at;

      if (!lastReadAt || new Date(lastCounterpartMessage.created_at) > new Date(lastReadAt)) {
        count++;
      }
    });
    return count;
  };

  const value: ChatContextType = {
    threads,
    isLoading,
    getOrCreateThread,
    getThreadById,
    getThreadsForUser,
    getMessages,
    sendMessage,
    closeThread,
    markThreadRead,
    getUnreadCount,
    getEffectiveStatus,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
