/**
 * Marketplace Screen - Access gated by marketplace registration + verification status
 * 
 * States:
 * 1. No registration submitted → Call-to-action to register
 * 2. Registration submitted, status='pending' → Blocked state (under review)
 * 3. Status='verified' → Full marketplace access (browse feed - FE-6 Step 1)
 * 4. Status='rejected' or 'revoked' → Allow resubmission with pre-filled data
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { MARKETPLACE_CATEGORIES, CONDITION_LABELS } from '../../constants/marketplaceCategories';
import { Listing } from '../../types/marketplace';
import { formatPHP } from '../../utils/formatCurrency';

export const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useUser();

  // Determine state based on marketplace_registration and verification_status
  const hasSubmittedRegistration = !!user?.marketplace_registration;
  const verificationStatus = user?.verification_status;

  // State 1: Not yet registered for marketplace
  if (!hasSubmittedRegistration || verificationStatus === 'not_submitted') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.callToActionCard}>
          <Ionicons name="cart-outline" size={64} color={colors.tertiary} />
          <Text style={styles.cardTitle}>Join the Marketplace</Text>
          <Text style={styles.cardDescription}>
            To buy, sell, and trade cosplay items, you need to register as a marketplace participant.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.featureText}>Browse and list cosplay items</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.featureText}>Propose trades with fairness assessment</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.featureText}>Request commissions from crafters</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.featureText}>Chat with other participants</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('MarketplaceRegistration')}
            activeOpacity={0.7}
          >
            <Text style={styles.ctaButtonText}>Register for Marketplace</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.backgroundLight} />
          </TouchableOpacity>

          <Text style={styles.infoNote}>
            Your registration will be reviewed by event organizers. This helps ensure a safe and trusted marketplace.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // State 2: Registration submitted, pending review
  if (verificationStatus === 'pending') {
    const submittedDate = user.marketplace_registration?.submitted_at
      ? new Date(user.marketplace_registration.submitted_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Unknown date';

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.blockedCard}>
          <Ionicons name="time-outline" size={64} color={colors.warning} />
          <Text style={styles.cardTitle}>Registration Under Review</Text>
          <Text style={styles.cardDescription}>
            Your marketplace registration is being reviewed by event organizers. You'll be notified once it's approved.
          </Text>

          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>PENDING</Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Submitted</Text>
              <Text style={styles.statusValue}>{submittedDate}</Text>
            </View>
          </View>

          <Text style={styles.infoNote}>
            Marketplace access will be unlocked as soon as your registration is approved. Thank you for your patience!
          </Text>
        </View>
      </ScrollView>
    );
  }

  // State 3: Verified — show marketplace browse feed (FE-6 Step 1)
  if (verificationStatus === 'verified') {
    return <MarketplaceBrowse />;
  }

  // State 4: Rejected or Revoked — allow resubmission
  if (verificationStatus === 'rejected' || verificationStatus === 'revoked') {
    const statusText = verificationStatus === 'rejected' ? 'Rejected' : 'Revoked';
    const statusColor = colors.error;
    const rejectionReason = user?.marketplace_registration?.rejection_reason;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.blockedCard}>
          <Ionicons name="close-circle-outline" size={64} color={statusColor} />
          <Text style={[styles.cardTitle, { color: statusColor }]}>
            Registration {statusText}
          </Text>
          <Text style={styles.cardDescription}>
            {verificationStatus === 'rejected'
              ? 'Your marketplace registration was not approved. You can update your information and resubmit for review.'
              : 'Your marketplace access has been revoked. If you believe this was a mistake, please update your information and resubmit.'}
          </Text>

          {/* Show rejection reason if available */}
          {rejectionReason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{rejectionReason}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: statusColor }]}
            onPress={() => navigation.navigate('MarketplaceRegistration')}
            activeOpacity={0.7}
          >
            <Text style={styles.ctaButtonText}>Register Again</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.backgroundLight} />
          </TouchableOpacity>

          <Text style={styles.infoNote}>
            Your previous information will be pre-filled. Update any fields as needed before resubmitting.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
};

/**
 * MarketplaceBrowse Component - Browse feed for verified users (FE-6 Step 1)
 */
const MarketplaceBrowse: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { getActiveListings, isLoading } = useMarketplace();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Check if user can create listings (seller or both role)
  const canCreateListing = user?.marketplace_registration?.marketplace_role === 'seller' ||
                           user?.marketplace_registration?.marketplace_role === 'both';

  // Filter listings by category
  const filteredListings = useMemo(() => {
    const active = getActiveListings();
    if (selectedCategory === 'All') return active;
    return active.filter(listing => listing.category === selectedCategory);
  }, [selectedCategory, getActiveListings]);

  const renderListingCard = ({ item }: { item: Listing }) => {
    const hasPhoto = item.photos && item.photos.length > 0;
    
    // Generate initials from title for placeholder
    const initials = item.title
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
    
    return (
      <TouchableOpacity
        style={styles.listingCard}
        onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Image/Thumbnail Area */}
          <View style={styles.listingThumbnail}>
            {hasPhoto ? (
              <Text style={styles.thumbnailPlaceholder}>📷</Text>
            ) : (
              <View style={styles.thumbnailInitials}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
            )}
          </View>

          {/* Card Details */}
          <View style={styles.listingDetails}>
            <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>

            <View style={styles.listingMeta}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{item.category}</Text>
              </View>
              <View style={styles.conditionTag}>
                <Text style={styles.conditionTagText}>{CONDITION_LABELS[item.condition]}</Text>
              </View>
            </View>

            <Text style={styles.listingPrice}>{formatPHP(item.price)}</Text>

            <Text style={styles.listingDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tertiary} />
        <Text style={styles.loadingText}>Loading marketplace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.browseContainer}>
      {/* Header with actions */}
      <View style={styles.browseHeader}>
        <TouchableOpacity
          style={styles.myOffersButton}
          onPress={() => navigation.navigate('OfferLog')}
          activeOpacity={0.7}
        >
          <Ionicons name="mail-outline" size={20} color={colors.tertiary} />
          <Text style={styles.myOffersButtonText}>My Offers</Text>
        </TouchableOpacity>
        {canCreateListing && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateListing')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={20} color={colors.backgroundLight} />
            <Text style={styles.createButtonText}>Create Listing</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter chips */}
      <View style={styles.filterScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory === 'All' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory('All')}
            activeOpacity={0.7}
          >
            <Text 
              style={[
                styles.filterChipText,
                selectedCategory === 'All' && styles.filterChipTextActive,
              ]}
              numberOfLines={1}
            >
              All
            </Text>
          </TouchableOpacity>
          {MARKETPLACE_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                selectedCategory === category && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.7}
            >
              <Text 
                style={[
                  styles.filterChipText,
                  selectedCategory === category && styles.filterChipTextActive,
                ]}
                numberOfLines={1}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Listings feed */}
      {filteredListings.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="cart-outline" size={80} color={colors.tertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>No Listings Found</Text>
            <Text style={styles.emptyStateText}>
              {selectedCategory === 'All'
                ? 'No active listings in the marketplace yet. Be the first to list an item!'
                : `No listings in the ${selectedCategory} category yet. Try browsing other categories or create your own listing.`}
            </Text>
            {canCreateListing && (
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('CreateListing')}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color={colors.backgroundLight} />
                <Text style={styles.emptyStateButtonText}>Create First Listing</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          renderItem={renderListingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listingsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  callToActionCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  blockedCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  reasonBox: {
    width: '100%',
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  reasonLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  reasonText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  featureList: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
    shadowColor: colors.tertiary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    ...typography.body,
    color: colors.backgroundLight,
    fontWeight: '700',
  },
  infoNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  statusBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  pendingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  pendingBadgeText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
  },
  // MarketplaceBrowse styles
  browseContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  browseHeader: {
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  myOffersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.tertiary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  myOffersButtonText: {
    ...typography.body,
    color: colors.tertiary,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tertiary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  createButtonText: {
    ...typography.body,
    color: colors.backgroundLight,
    fontWeight: '600',
  },
  filterScroll: {
    height: 56, // Fixed height container
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden', // Prevent content from expanding beyond this height
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, // Back to sm for better spacing
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, // Back to sm for better button feel
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
    flexShrink: 0, // Prevent text from shrinking
  },
  filterChipTextActive: {
    color: colors.backgroundLight,
  },
  listingsList: {
    padding: spacing.md,
    paddingBottom: spacing.xl, // Extra padding at bottom for comfortable scrolling
  },
  listingCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    height: 140, // Fixed height instead of minHeight - all cards same size
  },
  cardContent: {
    flexDirection: 'row',
    height: '100%', // Fill parent height exactly
  },
  listingThumbnail: {
    width: 100,
    height: '100%', // Fixed to fill card height exactly
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholder: {
    fontSize: 40,
  },
  thumbnailInitials: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.tertiary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 28,
    color: colors.tertiary,
    fontWeight: '700',
  },
  listingDetails: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between', // Distribute content evenly
  },
  listingTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  listingMeta: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryTag: {
    backgroundColor: colors.tertiary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  categoryTagText: {
    ...typography.caption,
    color: colors.tertiary,
    fontWeight: '600',
    fontSize: 11,
  },
  conditionTag: {
    backgroundColor: colors.secondary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  conditionTagText: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 11,
  },
  listingPrice: {
    ...typography.h3,
    color: colors.tertiary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  listingDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 18,
    fontSize: 13,
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
  emptyStateTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    shadowColor: colors.tertiary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    ...typography.body,
    color: colors.backgroundLight,
    fontWeight: '600',
  },
});

