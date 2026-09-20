/**
 * ForgeMind - Chat List Screen (FE-6 Step 4)
 * 
 * Chat content is transaction-scoped and is never screened, classified, scored,
 * or used as input to any AI/rule computation (see spec).
 * 
 * Shows all conversations for the current verified marketplace user.
 * Fixed-height chip bar: Open / Closed tabs.
 * Standardized card size with unread dots, counterpart name, listing title, preview.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MarketplaceStackParamList } from '../../navigation/MarketplaceStackNavigator';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useChat } from '../../contexts/ChatContext';
import { ChatThread } from '../../types/chat';
import { Button } from '../../components';
import { formatThreadStatus } from '../../utils/formatStatus';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'ChatList'>;

type TabType = 'open' | 'closed';

export const ChatListScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useUser();
  const { getThreadsForUser, getEffectiveStatus, getMessages } = useChat();

  const [selectedTab, setSelectedTab] = useState<TabType>('open');

  const isVerified = user?.verification_status === 'verified';

  // Route-level guard
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

  const allThreads = getThreadsForUser(user.email);

  const { openThreads, closedThreads } = useMemo(() => {
    const open: ChatThread[] = [];
    const closed: ChatThread[] = [];

    allThreads.forEach((thread) => {
      const effective = getEffectiveStatus(thread);
      if (effective.status === 'open') {
        open.push(thread);
      } else {
        closed.push(thread);
      }
    });

    // Sort by last_message_at descending (most recent first)
    const sortFn = (a: ChatThread, b: ChatThread) => {
      const aTime = a.last_message_at || a.created_at;
      const bTime = b.last_message_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    };

    return {
      openThreads: open.sort(sortFn),
      closedThreads: closed.sort(sortFn),
    };
  }, [allThreads]);

  const displayedThreads = selectedTab === 'open' ? openThreads : closedThreads;

  const renderThreadCard = ({ item }: { item: ChatThread }) => {
    const counterpartName =
      item.seller_email === user.email ? item.buyer_display_name : item.seller_display_name;

    const effectiveStatus = getEffectiveStatus(item);
    const statusLabel = formatThreadStatus(effectiveStatus.status, effectiveStatus.reason);

    // Unread dot: last message from counterpart is newer than my last_read_at
    const messages = getMessages(item.id);
    const lastCounterpartMessage = messages
      .filter((m) => m.sender_email !== user.email)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const myLastReadAt =
      item.buyer_email === user.email ? item.buyer_last_read_at : item.seller_last_read_at;

    const hasUnread =
      lastCounterpartMessage &&
      (!myLastReadAt || new Date(lastCounterpartMessage.created_at) > new Date(myLastReadAt));

    // Format date
    const dateStr = item.last_message_at || item.created_at;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let dateDisplay = '';
    if (diffMins < 1) {
      dateDisplay = 'Just now';
    } else if (diffMins < 60) {
      dateDisplay = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      dateDisplay = `${diffHours}h ago`;
    } else if (diffDays < 7) {
      dateDisplay = `${diffDays}d ago`;
    } else {
      dateDisplay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return (
      <TouchableOpacity
        style={styles.threadCard}
        onPress={() => navigation.navigate('ChatThread', { threadId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {hasUnread && <View style={styles.unreadDot} />}
            <Text style={styles.counterpartName} numberOfLines={1}>
              {counterpartName}
            </Text>
          </View>
          <Text style={styles.dateText}>{dateDisplay}</Text>
        </View>
        <Text style={styles.listingTitle} numberOfLines={1}>
          {item.listing_title}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.previewText} numberOfLines={1}>
            {item.last_message_preview || 'No messages yet'}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{statusLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const isOpen = selectedTab === 'open';
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name={isOpen ? 'chatbubbles-outline' : 'archive-outline'}
              size={80}
              color={colors.tertiary}
            />
          </View>
          <Text style={styles.emptyStateTitle}>
            {isOpen ? 'No Open Conversations' : 'No Closed Conversations'}
          </Text>
          <Text style={styles.emptyStateText}>
            {isOpen
              ? 'Start a conversation by messaging a seller on an active listing.'
              : 'Closed conversations will appear here.'}
          </Text>
          {isOpen && (
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('MarketplaceHome')}
              activeOpacity={0.7}
            >
              <Ionicons name="storefront" size={20} color={colors.backgroundLight} />
              <Text style={styles.emptyStateButtonText}>Browse Marketplace</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed-height chip bar */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBarContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedTab === 'open' && styles.filterChipActive]}
            onPress={() => setSelectedTab('open')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedTab === 'open' && styles.filterChipTextActive,
              ]}
            >
              Open
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedTab === 'closed' && styles.filterChipActive]}
            onPress={() => setSelectedTab('closed')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedTab === 'closed' && styles.filterChipTextActive,
              ]}
            >
              Closed
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Thread list */}
      <FlatList
        data={displayedThreads}
        renderItem={renderThreadCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
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
  filterBarContainer: {
    height: 56, // Fixed height
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden', // Prevent expansion
  },
  filterBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    height: '100%',
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 36,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.backgroundLight,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  threadCard: {
    height: 110, // Fixed height - standardized card size
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between', // Distribute content evenly
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  counterpartName: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  listingTitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  previewText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  emptyStateButtonText: {
    ...typography.body,
    color: colors.backgroundLight,
    fontWeight: '600',
  },
});
