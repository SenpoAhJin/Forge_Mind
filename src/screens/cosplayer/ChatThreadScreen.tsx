/**
 * ForgeMind - Chat Thread Screen (FE-6 Step 4)
 * 
 * Chat content is transaction-scoped and is never screened, classified, scored,
 * or used as input to any AI/rule computation (see spec).
 * 
 * Shows individual conversation between buyer and seller for one listing.
 * Route-level guard: user must be verified and one of the two participants.
 * Open thread: send messages, close conversation action.
 * Closed thread: read-only with reason banner, input disabled.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    getThreadById,
    getMessages,
    sendMessage,
    closeThread,
    markThreadRead,
    getEffectiveStatus,
  } = useChat();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [confirmCloseVisible, setConfirmCloseVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  const thread = getThreadById(threadId);
  const messages = thread ? getMessages(threadId) : [];
  const effectiveStatus = thread ? getEffectiveStatus(thread) : { status: 'closed' as const };

  const isVerified = user?.verification_status === 'verified';
  const isParticipant = thread
    ? thread.seller_email === user?.email || thread.buyer_email === user?.email
    : false;

  const counterpartName = thread
    ? thread.seller_email === user?.email
      ? thread.buyer_display_name
      : thread.seller_display_name
    : '';

  const isBuyer = thread?.buyer_email === user?.email;

  // Route-level guard
  if (!user || !isVerified || !thread || !isParticipant) {
    return (
      <View style={styles.blockedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.textDisabled} />
        <Text style={styles.blockedTitle}>Access Restricted</Text>
        <Text style={styles.blockedText}>
          {!user || !isVerified
            ? 'Only verified marketplace users can access conversations.'
            : !thread
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

  // Mark as read on mount and when messages change
  useEffect(() => {
    if (user?.email && thread) {
      markThreadRead(threadId, user.email);
    }
  }, [messages.length, threadId, user?.email]);

  // Scroll to bottom when messages load or new message sent
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const handleSend = async () => {
    if (!user?.email || !messageText.trim() || isSending) return;

    setIsSending(true);
    const result = await sendMessage(threadId, user.email, messageText);
    setIsSending(false);

    if (result.success) {
      setMessageText('');
      // Scroll handled by useEffect
    } else {
      setErrorMessage(result.error || 'Failed to send message.');
      setErrorVisible(true);
    }
  };

  const handleClose = async () => {
    if (!user?.email) return;
    const result = await closeThread(threadId, user.email);
    if (result.success) {
      setConfirmCloseVisible(false);
      // Thread will re-render as closed
    } else {
      setConfirmCloseVisible(false);
      setErrorMessage(result.error || 'Failed to close conversation.');
      setErrorVisible(true);
    }
  };

  const handleListingPress = () => {
    navigation.navigate('ListingDetail', { listingId: thread.listing_id });
  };

  const handleActionPress = () => {
    if (isBuyer) {
      navigation.navigate('ListingDetail', { listingId: thread.listing_id });
    } else {
      navigation.navigate('OfferLog', { initialTab: 'received' });
    }
  };

  const isOpen = effectiveStatus.status === 'open';
  const closedReasonText =
    effectiveStatus.reason === 'listing_unavailable'
      ? 'This listing is no longer available.'
      : 'This conversation was closed.';

  const ContentArea = (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.counterpartName}>{counterpartName}</Text>
          {!isOpen && (
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>Closed</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleListingPress} activeOpacity={0.7}>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {thread.listing_title}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      {isOpen && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} />
          <View style={styles.infoBannerTextContainer}>
            <Text style={styles.infoBannerText}>
              Chat is for questions and clarification. Any final price or timeline must be
              submitted as a structured offer.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.infoBannerAction}
            onPress={handleActionPress}
            activeOpacity={0.7}
          >
            <Text style={styles.infoBannerActionText}>
              {isBuyer ? 'Go to Listing' : 'View Offers'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textDisabled} />
            <Text style={styles.emptyStateText}>No messages yet. Start the conversation!</Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isSender = msg.sender_email === user?.email;
            const timestamp = new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <ChatBubble
                key={msg.id}
                type={isSender ? 'sender' : 'receiver'}
                message={msg.body}
                timestamp={timestamp}
              />
            );
          })
        )}
      </ScrollView>

      {/* Input Bar or Closed Notice */}
      {isOpen ? (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textDisabled}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || isSending}
            activeOpacity={0.7}
          >
            <Ionicons
              name="send"
              size={20}
              color={messageText.trim() && !isSending ? colors.backgroundLight : colors.textDisabled}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedNotice}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.closedNoticeText}>{closedReasonText}</Text>
        </View>
      )}

      {/* Close Action (Open threads only) */}
      {isOpen && (
        <View style={styles.closeActionBar}>
          <TouchableOpacity
            style={styles.closeActionButton}
            onPress={() => setConfirmCloseVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={styles.closeActionText}>Close conversation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <ConfirmationModal
        visible={confirmCloseVisible}
        title="Close Conversation"
        message="Are you sure you want to close this conversation? Both participants will no longer be able to send messages."
        confirmText="Close"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={handleClose}
        onCancel={() => setConfirmCloseVisible(false)}
      />
      <ConfirmationModal
        visible={errorVisible}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        onConfirm={() => setErrorVisible(false)}
        onCancel={() => setErrorVisible(false)}
      />
    </View>
  );

  // KeyboardAvoidingView only on native
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {ContentArea}
      </KeyboardAvoidingView>
    );
  }

  return ContentArea;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  blockedContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  blockedTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
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
  header: {
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  counterpartName: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  closedBadge: {
    backgroundColor: colors.textDisabled,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  closedBadgeText: {
    ...typography.caption,
    color: colors.backgroundLight,
    fontWeight: '600',
  },
  listingTitle: {
    ...typography.body,
    color: colors.tertiary,
    textDecorationLine: 'underline',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.info + '10',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  infoBannerTextContainer: {
    flex: 1,
  },
  infoBannerText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  infoBannerAction: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  infoBannerActionText: {
    ...typography.caption,
    color: colors.backgroundLight,
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  closedNoticeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  closeActionBar: {
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  closeActionText: {
    ...typography.body,
    color: colors.error,
  },
});
