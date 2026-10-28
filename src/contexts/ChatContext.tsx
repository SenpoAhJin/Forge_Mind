/**
 * ForgeMind - Chat Context (Server Integration)
 *
 * Server screens messages at send-time with rule-based word filter (no AI).
 * Chat content is not stored for analysis.
 *
 * Manages marketplace chat threads and messages from forgemind-backend server.
 * Only buyers can start threads. Threads appear after first message sent.
 * 
 * Context guards mirror server rules:
 *  - Start thread: verified buyer on active listing, not seller's own listing
 *  - Send message: participant only, thread must be open, listing must be active
 *  - Close thread: participant only, open threads only
 *
 * Polling: Active thread (ChatThreadScreen focused) refetches every ~5s. Updates
 * only when message count or last message changes. Pauses when app backgrounded.
 * Unread count refreshes on focus + every ~20s while active.
 *
 * Identity: user_id (not email). Server never returns emails.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ChatApi from '../services/ChatApi';
import { useUser } from './UserContext';

// Re-export server types for convenience
export type { ServerThread, ServerMessage } from '../services/ChatApi';

interface ChatContextType {
  threads: ChatApi.ServerThread[];
  isLoading: boolean;
  needsRelogin: boolean;
  unreadCount: number;
  
  // Thread management
  startThread: (listing_id: string) => Promise<
    { success: true; thread: ChatApi.ServerThread } | { success: false; error: string }
  >;
  getThreadById: (thread_id: string) => ChatApi.ServerThread | undefined;
  getThreadForListing: (listing_id: string, buyer_user_id: string) => ChatApi.ServerThread | undefined;
  refreshThreads: () => Promise<void>;
  closeThread: (thread_id: string) => Promise<{ success: true } | { success: false; error: string }>;
  
  // Messages (for active thread polling)
  activeThread: { thread: ChatApi.ServerThread; messages: ChatApi.ServerMessage[] } | null;
  loadThread: (thread_id: string) => Promise<
    { success: true; thread: ChatApi.ServerThread; messages: ChatApi.ServerMessage[] } | { success: false; error: string }
  >;
  sendMessage: (thread_id: string, body: string) => Promise<
    | { success: true; message: ChatApi.ServerMessage }
    | { success: false; error: string; blocked?: boolean; blockMessage?: string }
  >;
  markThreadRead: (thread_id: string) => Promise<void>;
  
  // Polling control (for ChatThreadScreen)
  startPolling: (thread_id: string) => void;
  stopPolling: () => void;
  
  // Unread
  refreshUnreadCount: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [threads, setThreads] = useState<ChatApi.ServerThread[]>([]);
  const [activeThread, setActiveThread] = useState<{
    thread: ChatApi.ServerThread;
    messages: ChatApi.ServerMessage[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unreadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingThreadIdRef = useRef<string | null>(null);
  const isPollingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Check if user session lacks user_id (old cached session)
  const needsRelogin = user !== null && !user.user_id;

  // Clear all chat state and stop polling on logout/account switch
  useEffect(() => {
    if (!user?.user_id) {
      // User logged out or switched accounts - clear everything
      setThreads([]);
      setActiveThread(null);
      setUnreadCount(0);
      setIsLoading(false);
      stopPolling();
      stopUnreadPolling();
    }
  }, [user?.user_id]);

  // Refresh threads on mount if user logged in
  useEffect(() => {
    if (user?.user_id) {
      refreshThreads();
      refreshUnreadCount();
    }
  }, [user?.user_id]);

  // Unread count polling (every ~20s while app active)
  useEffect(() => {
    if (!user?.user_id) return;

    const startUnreadPolling = () => {
      stopUnreadPolling();
      unreadIntervalRef.current = setInterval(() => {
        if (appStateRef.current === 'active' && user?.user_id) {
          refreshUnreadCount();
        }
      }, 20000);
    };

    startUnreadPolling();
    return () => stopUnreadPolling();
  }, [user?.user_id]);

  // AppState listener - pause polling when backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;
      
      // Stop polling when app goes to background
      if (nextAppState !== 'active' && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        isPollingRef.current = false;
      }
      
      // Resume polling when app comes back to foreground
      if (nextAppState === 'active' && pollingThreadIdRef.current) {
        startPollingInterval(pollingThreadIdRef.current);
      }
    });

    return () => subscription.remove();
  }, []);

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      stopUnreadPolling();
    };
  }, []);

  const stopUnreadPolling = () => {
    if (unreadIntervalRef.current) {
      clearInterval(unreadIntervalRef.current);
      unreadIntervalRef.current = null;
    }
  };

  const refreshThreads = useCallback(async () => {
    if (!user?.user_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await ChatApi.getThreads();
    setIsLoading(false);

    if (result.success) {
      setThreads(result.threads);
    }
  }, [user?.user_id]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.user_id) return;

    const result = await ChatApi.getUnreadCount();
    if (result.success) {
      setUnreadCount(result.unread_count);
    }
  }, [user?.user_id]);

  const startThread = async (
    listing_id: string
  ): Promise<{ success: true; thread: ChatApi.ServerThread } | { success: false; error: string }> => {
    if (!user?.user_id) {
      return { success: false, error: 'Please log in again to start a conversation.' };
    }

    const result = await ChatApi.createThread(listing_id);
    if (result.success) {
      // Refresh threads to show the new one
      await refreshThreads();
    }
    return result;
  };

  const loadThread = async (
    thread_id: string
  ): Promise<
    { success: true; thread: ChatApi.ServerThread; messages: ChatApi.ServerMessage[] } | { success: false; error: string }
  > => {
    if (!user?.user_id) {
      return { success: false, error: 'Please log in again to view conversations.' };
    }

    const result = await ChatApi.getThread(thread_id);
    if (result.success) {
      setActiveThread({ thread: result.thread, messages: result.messages });
    }
    return result;
  };

  const sendMessage = async (
    thread_id: string,
    body: string
  ): Promise<
    | { success: true; message: ChatApi.ServerMessage }
    | { success: false; error: string; blocked?: boolean; blockMessage?: string }
  > => {
    if (!user?.user_id) {
      return { success: false, error: 'Please log in again to send messages.' };
    }

    const result = await ChatApi.sendMessage(thread_id, body);
    if (result.success) {
      // Refresh active thread to show new message
      await loadThread(thread_id);
      // Refresh threads list to update preview
      await refreshThreads();
    }
    return result;
  };

  const closeThread = async (
    thread_id: string
  ): Promise<{ success: true } | { success: false; error: string }> => {
    if (!user?.user_id) {
      return { success: false, error: 'Please log in again.' };
    }

    const result = await ChatApi.closeThread(thread_id);
    if (result.success) {
      // Refresh to show updated status
      await refreshThreads();
      if (activeThread?.thread.thread_id === thread_id) {
        await loadThread(thread_id);
      }
    }
    return result;
  };

  const markThreadRead = async (thread_id: string): Promise<void> => {
    if (!user?.user_id) return;

    const result = await ChatApi.markThreadRead(thread_id);
    if (result.success) {
      // Refresh unread count
      await refreshUnreadCount();
      // Refresh threads list to update has_unread
      await refreshThreads();
    }
  };

  const getThreadById = (thread_id: string): ChatApi.ServerThread | undefined => {
    return threads.find((t) => t.thread_id === thread_id);
  };

  const getThreadForListing = (
    listing_id: string,
    buyer_user_id: string
  ): ChatApi.ServerThread | undefined => {
    return threads.find(
      (t) => t.listing_id === listing_id && t.buyer_user_id === buyer_user_id
    );
  };

  // Polling for active thread (ChatThreadScreen)
  const startPollingInterval = (thread_id: string) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Only start if app is active
    if (appStateRef.current !== 'active') return;

    pollingIntervalRef.current = setInterval(async () => {
      // Skip this tick if previous request still in flight
      if (isPollingRef.current) return;

      // Skip if thread is closed
      const thread = getThreadById(thread_id);
      if (thread?.status === 'closed') {
        stopPolling();
        return;
      }

      isPollingRef.current = true;
      const result = await ChatApi.getThread(thread_id);
      isPollingRef.current = false;

      if (result.success) {
        // Only update state if messages changed (avoid unnecessary re-renders)
        if (activeThread?.thread.thread_id === thread_id) {
          const messageCountChanged = result.messages.length !== activeThread.messages.length;
          const lastMessageChanged =
            result.messages.length > 0 &&
            activeThread.messages.length > 0 &&
            result.messages[result.messages.length - 1].message_id !==
              activeThread.messages[activeThread.messages.length - 1].message_id;

          if (messageCountChanged || lastMessageChanged) {
            setActiveThread({ thread: result.thread, messages: result.messages });
          }
        }
      }
    }, 5000);
  };

  const startPolling = (thread_id: string) => {
    pollingThreadIdRef.current = thread_id;
    startPollingInterval(thread_id);
  };

  const stopPolling = () => {
    pollingThreadIdRef.current = null;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
  };

  const value: ChatContextType = {
    threads,
    isLoading,
    needsRelogin,
    unreadCount,
    startThread,
    getThreadById,
    getThreadForListing,
    refreshThreads,
    closeThread,
    activeThread,
    loadThread,
    sendMessage,
    markThreadRead,
    startPolling,
    stopPolling,
    refreshUnreadCount,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
