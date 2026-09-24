/**
 * Offer Log Screen (FE-6 Step 3)
 * Sent / Received structured offers with status filtering.
 * Received tab is only available to seller / both-role accounts.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useOffers } from '../../contexts/OffersContext';
import { useCommissionMilestones } from '../../contexts/CommissionMilestonesContext';
import { Offer, OfferStatus } from '../../types/offers';
import { CONDITION_LABELS } from '../../constants/marketplaceCategories';
import { formatOfferStatus, formatOfferType } from '../../utils/formatStatus';
import { formatPHP } from '../../utils/formatCurrency';
import { MarketplaceStackParamList } from '../../navigation/MarketplaceStackNavigator';

type OfferLogRouteProp = RouteProp<
  { params: { initialTab?: 'sent' | 'received' } | undefined },
  'params'
>;

type OfferStatusFilter = 'all' | OfferStatus;

const STATUS_FILTERS: OfferStatusFilter[] = ['all', 'pending', 'accepted', 'declined', 'withdrawn'];

const statusColor = (status: OfferStatus): string => {
  switch (status) {
    case 'pending':
      return colors.warning;
    case 'accepted':
      return colors.success;
    case 'declined':
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

const typeColor = (offerType: Offer['offer_type']): string => {
  switch (offerType) {
    case 'purchase':
      return colors.tertiary;
    case 'trade':
      return colors.secondary;
    default:
      return colors.primary;
  }
};

export const OfferLogScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MarketplaceStackParamList>>();
  const route = useRoute<OfferLogRouteProp>();
  const { user } = useUser();
  const { getOffersSentBy, getOffersReceivedFor, isLoading } = useOffers();
  const { getProgressPercentage } = useCommissionMilestones();

  const role = user?.marketplace_registration?.marketplace_role;
  const canReceive = role === 'seller' || role === 'both';

  const initialTab = route.params?.initialTab === 'received' ? 'received' : 'sent';
  const [tab, setTab] = useState<'sent' | 'received'>(
    !canReceive && initialTab === 'received' ? 'sent' : initialTab
  );
  const [filter, setFilter] = useState<OfferStatusFilter>('all');

  const offers = tab === 'sent'
    ? getOffersSentBy(user?.email ?? '')
    : getOffersReceivedFor(user?.email ?? '');

  const filteredOffers = filter === 'all'
    ? offers
    : offers.filter(offer => offer.status === filter);

  const renderOfferCard = (offer: Offer) => {
    const isSent = tab === 'sent';
    const formatDate = (iso: string): string =>
      new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const detailLine = () => {
      if (offer.offer_type === 'purchase') {
        return `Offering ${formatPHP(offer.offered_price ?? 0)} · asking ${formatPHP(offer.listing_price)}`;
      }
      if (offer.offer_type === 'trade') {
        const condition = offer.trade_offered_condition
          ? CONDITION_LABELS[offer.trade_offered_condition]
          : '';
        return `Offering: ${offer.trade_offered_item ?? ''}${condition ? ` (${condition})` : ''}`;
      }
      return `${offer.commission_description ?? ''} · ${formatPHP(offer.offered_price ?? 0)}`;
    };

    // Get progress for accepted commission offers
    const isAcceptedCommission = offer.offer_type === 'commission' && offer.status === 'accepted';
    const progress = isAcceptedCommission ? getProgressPercentage(offer.id) : null;

    return (
      <TouchableOpacity
        style={styles.offerCard}
        onPress={() => navigation.navigate('OfferDetail', { offerId: offer.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeTag, { backgroundColor: typeColor(offer.offer_type) + '15' }]}>
            <Text style={[styles.typeTagText, { color: typeColor(offer.offer_type) }]}>
              {formatOfferType(offer.offer_type)}
            </Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: statusColor(offer.status) + '15' }]}>
            <Text style={[styles.statusTagText, { color: statusColor(offer.status) }]}>
              {formatOfferStatus(offer.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.listingTitle} numberOfLines={2}>{offer.listing_title}</Text>
        <Text style={styles.detailLine} numberOfLines={2}>{detailLine()}</Text>

        {/* Progress indicator for accepted commission offers */}
        {isAcceptedCommission && progress !== null && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}% Complete</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.counterparty} numberOfLines={1}>
            {isSent
              ? `To: ${offer.seller_display_name}`
              : `From: ${offer.proposer_display_name}`}
          </Text>
          <Text style={styles.cardDate}>{formatDate(offer.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tertiary} />
        <Text style={styles.loadingText}>Loading offers...</Text>
      </View>
    );
  }

  const emptyState = () => {
    const isFiltered = filter !== 'all';
    if (filteredOffers.length > 0) {
      return renderOffersList();
    }

    const title = isFiltered
      ? `No ${filter} offers`
      : tab === 'sent'
        ? 'No Offers Sent Yet'
        : 'No Received Offers Yet';
    const text = isFiltered
      ? 'No offers match the selected status.'
      : tab === 'sent'
        ? 'When you send an offer on a listing, it will appear here.'
        : 'When a participant makes an offer on one of your listings, it will appear here.';

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name={tab === 'sent' ? 'paper-plane-outline' : 'mail-open-outline'}
              size={80}
              color={colors.tertiary}
            />
          </View>
          <Text style={styles.emptyTitle}>{title}</Text>
          <Text style={styles.emptyText}>{text}</Text>
        </View>
      </View>
    );
  };

  const renderOffersList = () => {
    return (
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredOffers.map(offer => renderOfferCard(offer))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      {canReceive && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === 'sent' && styles.tabActive]}
            onPress={() => setTab('sent')}
            activeOpacity={0.7}
          >
            <Ionicons name="paper-plane-outline" size={16} color={tab === 'sent' ? colors.backgroundLight : colors.textSecondary} />
            <Text style={[styles.tabText, tab === 'sent' && styles.tabTextActive]}>Sent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'received' && styles.tabActive]}
            onPress={() => setTab('received')}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-open-outline" size={16} color={tab === 'received' ? colors.backgroundLight : colors.textSecondary} />
            <Text style={[styles.tabText, tab === 'received' && styles.tabTextActive]}>Received</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status filter chips */}
      <View style={styles.filterScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {STATUS_FILTERS.map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                filter === status && styles.filterChipActive,
              ]}
              onPress={() => setFilter(status)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === status && styles.filterChipTextActive,
                ]}
                numberOfLines={1}
              >
                {status === 'all' ? 'All' : formatOfferStatus(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {emptyState()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.tertiary,
  },
  tabText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.backgroundLight,
  },
  filterScroll: {
    height: 56,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.tertiary,
    borderColor: colors.tertiary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    flexShrink: 0,
  },
  filterChipTextActive: {
    color: colors.backgroundLight,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  offerCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    minHeight: 120,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  typeTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  typeTagText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  statusTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  statusTagText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  listingTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  detailLine: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 18,
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  counterparty: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  cardDate: {
    ...typography.caption,
    color: colors.textDisabled,
  },
  progressSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  emptyStateCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.tertiary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});