/**
 * ForgeMind - Chat Thread Screen (Server Integration)
 * 
 * Server screens messages at send-time with rule-based word filter (no AI).
 * Chat content is not stored for analysis.
 * 
 * Shows individual conversation between buyer and seller for one listing.
 * Route-level guard: user must be verified and participant (by user_id).
 * Open thread: send messages, close conversation action.
 * Closed thread: read-only with reason banner, input disabled, history readable.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MarketplaceStackParamList } from '../../navigation/MarketplaceStackNavigator';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useChat } from '../../contexts/ChatContext';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Button } from '../../components';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'ChatThread'>;

export const ChatThreadScreen: React.FC<Props> = ({ route, navigation }) => {
  const { threadId } = route.params;
  const { user } = useUser();
  const {
    activeThread,
    loadThread,
    sendMessage: sendMessageApi,
    closeThread: closeThreadApi,
    markThreadRead,
    startPolling,
    stopPolling,
    needsRelogin,
  } = useChat();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmCloseVisible, setConfirmCloseVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [blockNotice, setBlockNotice] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const thread = activeThread?.thread;
  const messages = activeThread?.messages || [];

  const isVerified = user?.verification_status === 'verified';
  const isParticipant = thread
    ? thread.seller_user_id === user?.user_id || thread.buyer_user_id === user?.user_id
    : false;

  const counterpartName = thread
    ? thread.seller_user_id === user?.user_id
      ? thread.buyer_display_name
      : thread.seller_display_name
    : '';

  const isClosed = thread?.status === 'closed';
  const closedReason = thread?.closed_reason;

  // Load thread on mount and start polling
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const result = await loadThread(threadId);
      setIsLoading(false);
      
      if (!result.success) {
        setErrorMessage(result.error);
        setErrorVisible(true);
      }
    };
    
    load();
  }, [threadId]);

  // Start/stop polling when focused
  useFocusEffect(
    React.useCallback(() => {
      if (thread && !isClosed) {
        startPolling(threadId);
      }
      
      return () => {
        stopPolling();
      };
    }, [threadId, isClosed])
  );

  // Mark as read on mount and when messages change
  useEffect(() => {
    if (user?.user_id && thread && messages.length > 0) {
      markThreadRead(threadId);
    }
  }, [threadId, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Route-level guard
  if (needsRelogin) {
    return (
      <View style={styles.blockedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.textDisabled} />
        <Text style={styles.blockedTitle}>Session Expired</Text>
        <Text style={styles.blockedText}>
          Please log in again to view conversations.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.blockedButton}
        />
      </View>
    );
  }

  if (!user || !isVerified) {
    return (
      <View style={styles.blockedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.textDisabled} />
        <Text style={styles.blockedTitle}>Access Restricted</Text>
        <Text style={styles.blockedText}>
          Only verified marketplace users can access conversations.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.blockedButton}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  if (!thread || !isParticipant) {
    return (
      <View style={styles.blockedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.textDisabled} />
        <Text style={styles.blockedTitle}>Access Restricted</Text>
        <Text style={styles.blockedText}>
          {!thread
            ? 'This conversation does not exist.'
            : 'You are not a participant in this conversation.'}
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.blockedButton}
        />
      </View>
    );
  }

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    if (trimmed.length > 1000) {
      setErrorMessage('Message is too long (max 1000 characters).');
      setErrorVisible(true);
      return;
    }

    setIsSending(true);
    setBlockNotice(null);

    const result = await sendMessageApi(threadId, trimmed);
    setIsSending(false);

    if (result.success) {
      setMessageText(''); // Clear input only on success
      setBlockNotice(null);
    } else {
      // 422 blocked: show notice, keep typed text
      if (result.blocked && result.blockMessage) {
        setBlockNotice(result.blockMessage);
        // Keep messageText as is - DO NOT clear
      } else {
        setErrorMessage(result.error);
        setErrorVisible(true);
      }
    }
  };

  const handleClose = async () => {
    setConfirmCloseVisible(false);
    const result = await closeThreadApi(threadId);
    if (!result.success) {
      setErrorMessage(result.error);
      setErrorVisible(true);
    }
  };

  const getClosedBannerText = () => {
    if (closedReason === 'listing_unavailable') {
      return 'This listing is no longer available.';
    }
    return 'This conversation is closed.';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{counterpartName}</Text>
          <Text style={styles.headerSubtitle}>{thread.listing_title}</Text>
        </View>
        {!isClosed && (
          <TouchableOpacity
            onPress={() => setConfirmCloseVisible(true)}
            style={styles.closeButton}
          >
            <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isClosed && (
        <View style={styles.closedBanner}>
          <Ionicons name="lock-closed" size={16} color={colors.textDisabled} />
          <Text style={styles.closedBannerText}>{getClosedBannerText()}</Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation below</Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isSender = msg.sender_user_id === user?.user_id;
            const timestamp = new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <ChatBubble
                key={msg.message_id}
                message={msg.body}
                timestamp={timestamp}
                isSender={isSender}
                senderName={isSender ? 'You' : msg.sender_display_name}
              />
            );
          })
        )}
      </ScrollView>

      {blockNotice && (
        <View style={styles.blockNotice}>
          <Ionicons name="warning" size={16} color={colors.error} />
          <Text style={styles.blockNoticeText}>{blockNotice}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            isClosed && styles.inputDisabled,
          ]}
          value={messageText}
          onChangeText={setMessageText}
          placeholder={isClosed ? 'Conversation closed' : 'Type a message...'}
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={1000}
          editable={!isClosed && !isSending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (isClosed || isSending || !messageText.trim()) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={isClosed || isSending || !messageText.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <ConfirmationModal
        visible={confirmCloseVisible}
        title="Close Conversation"
        message="Are you sure you want to close this conversation? This cannot be undone."
        confirmText="Close"
        cancelText="Cancel"
        onConfirm={handleClose}
        onCancel={() => setConfirmCloseVisible(false)}
        variant="warning"
      />

      <ConfirmationModal
        visible={errorVisible}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        onConfirm={() => setErrorVisible(false)}
        variant="error"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
  },
  closeButton: {
    marginLeft: spacing.sm,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.warning + '20',
    gap: spacing.xs,
  },
  closedBannerText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.small,
    color: colors.textDisabled,
  },
  blockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error + '15',
    gap: spacing.xs,
  },
  blockNoticeText: {
    ...typography.small,
    color: colors.error,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    color: colors.text,
  },
  inputDisabled: {
    backgroundColor: colors.disabled,
    color: colors.textDisabled,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  blockedTitle: {
    ...typography.heading2,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  blockedText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  blockedButton: {
    minWidth: 120,
  },
});
