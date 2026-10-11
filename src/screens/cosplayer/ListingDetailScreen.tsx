/**
 * Listing Detail Screen (FE-6 Steps 1, 3, 4)
 * Shows full listing details with offer buttons and messaging
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { CONDITION_LABELS } from '../../constants/marketplaceCategories';
import { Button } from '../../components';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { getListingPriceLabel, getListingSellerName } from '../../utils/marketplaceMapping';
import { getAllowedOfferTypes } from '../../utils/offerRules';
import { OfferType } from '../../types/offers';
import { MarketplaceStackParamList } from '../../navigation/MarketplaceStackNavigator';

type ListingDetailRouteProp = RouteProp<{ params: { listingId: string } }, 'params'>;

export const ListingDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MarketplaceStackParamList>>();
  const route = useRoute<ListingDetailRouteProp>();
  const { user } = useUser();
  const { getListingById, removeListing, deleteListingPermanently, refreshListings } = useMarketplace();

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sellerPortfolio, setSellerPortfolio] = useState<string[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [serverSoonNote, setServerSoonNote] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [galleryWidth, setGalleryWidth] = useState(0);
  const photoScrollRef = useRef<FlatList>(null);

  const listing = getListingById(route.params.listingId);

  // Track mount status
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Seller portfolio (commission/service categories only).
  // The listing carries the seller's user id, but a locally stored account has
  // no user id (AuthService.StoredAccount is keyed by email), so there is
  // nothing to match on here and nothing to crash on: the portfolio section is
  // simply absent until the account record carries a server id.
  useEffect(() => {
    if (listing) {
      setSellerPortfolio([]);
    }
  }, [listing]);

  if (!listing) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorTitle}>Listing Not Found</Text>
        <Text style={styles.errorText}>
          This listing may have been removed or is no longer available.
        </Text>
        <Button
          title="Back to Marketplace"
          onPress={() => navigation.goBack()}
          variant="primary"
        />
      </View>
    );
  }

  // FE-6 Step 3: a verified, non-seller participant on their own feed can open
  // a structured offer flow against an active listing. Seller-only accounts
  // cannot make offers (they can only receive them).
  //
  // Ownership is answered by the server's is_owner flag, never by comparing
  // the signed-in user's email with a seller email.
  const isEligibleToOffer =
    user?.verification_status === 'verified' &&
    user?.marketplace_registration?.marketplace_role !== 'seller' &&
    !listing.is_owner &&
    listing.status === 'active';
  const allowedOfferTypes = getAllowedOfferTypes(listing.category);

  // FE-6 Step 4: messaging eligibility
  const isVerified = user?.verification_status === 'verified';
  const isSeller = listing.is_owner === true;
  const canMessageSeller =
    isVerified &&
    !isSeller &&
    listing.status === 'active' &&
    user?.marketplace_registration?.marketplace_role !== 'seller';

  // The signed-in user record has no server id, so an offer or a chat thread
  // cannot yet be tied to a seller without an email, which the server does not
  // hand out. Both entry points say so instead of starting a broken flow.

  const handleOfferUnavailable = () => {
    setServerSoonNote('Offers and chat will use the server in an upcoming update.');
  };

  const handleViewMessages = () => {
    navigation.navigate('ChatList');
  };

  const handleDeleteListing = async () => {
    if (!isMounted) return;
    setIsDeleting(true);
    
    // If active/blocked, remove first
    const removableStatuses = ['active', 'blocked'];
    if (listing && removableStatuses.includes(listing.status)) {
      const removeResult = await removeListing(listing.id, 'other');
      if (!removeResult.success) {
        if (isMounted) {
          setIsDeleting(false);
          setDeleteModalVisible(false);
          setErrorMessage(removeResult.error || 'Could not remove listing');
          setErrorVisible(true);
        }
        return;
      }
    }

    // Now delete permanently
    const deleteResult = listing ? await deleteListingPermanently(listing.id) : { success: false, error: 'Listing not found' };
    if (isMounted) {
      setIsDeleting(false);
      setDeleteModalVisible(false);
    }

    if (deleteResult.success) {
      navigation.goBack();
      refreshListings(); // Don't await, let it happen in background
    } else {
      const error = deleteResult.error || '';
      if (error.includes('404') || error.toLowerCase().includes('not found') || error.toLowerCase().includes('no longer exists')) {
        navigation.goBack();
        refreshListings();
        return;
      }
      
      if (!isMounted) return;
      
      if (error.includes('403') || error.toLowerCase().includes('own')) {
        setErrorMessage('You can only delete your own listings');
      } else if (error.includes('409') || error.toLowerCase().includes('cannot be deleted')) {
        setErrorMessage('This listing cannot be deleted right now');
      } else if (error.toLowerCase().includes('hidden but was not fully deleted')) {
        setErrorMessage('The listing is hidden but was not fully deleted. Try again.');
        refreshListings();
      } else {
        setErrorMessage('Could not delete. Check your connection and try again.');
      }
      setErrorVisible(true);
    }
  };

  const offerButtonLabels: Record<OfferType, string> = {
    purchase: 'Make Purchase Offer',
    trade: 'Propose Trade',
    commission: 'Request Commission',
  };

  const formattedPrice = getListingPriceLabel(listing);

  const postTypeLabels = {
    sell: 'Selling',
    trade: 'Trading',
    commission: 'Commission',
  };

  const postTypeIcons = {
    sell: 'cash-outline',
    trade: 'swap-horizontal-outline',
    commission: 'hammer-outline',
  };

  const postType = listing.post_type;

  const formattedDate = new Date(listing.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{listing.title}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formattedPrice}</Text>
          <View style={styles.conditionBadge}>
            <Text style={styles.conditionText}>
              {CONDITION_LABELS[listing.condition]}
            </Text>
          </View>
        </View>
        
        {/* Post Type Badge */}
        <View style={styles.transactionTypeBadge}>
          <Ionicons 
            name={postTypeIcons[postType] as any} 
            size={16} 
            color={colors.primary} 
          />
          <Text style={styles.transactionTypeText}>
            {postTypeLabels[postType]}
          </Text>
        </View>
      </View>

      {/* Photo Gallery */}
      {listing.photos && listing.photos.length > 0 && (
        <View 
          style={styles.photoGallery}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            setGalleryWidth(width);
          }}
        >
          {galleryWidth > 0 && (
            <FlatList
              ref={photoScrollRef}
              data={listing.photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / galleryWidth
                );
                setCurrentPhotoIndex(index);
              }}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.url }}
                  style={[styles.galleryPhoto, { width: galleryWidth }]}
                  resizeMode="contain"
                  accessibilityLabel={`Listing photo ${listing.photos.indexOf(item) + 1} of ${listing.photos.length}`}
                  accessibilityRole="image"
                />
              )}
              keyExtractor={(item) => item.photo_id}
            />
          )}
          {listing.photos.length > 1 && (
            <View style={styles.photoIndicator}>
              {listing.photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicatorDot,
                    index === currentPhotoIndex && styles.indicatorDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Category */}
      <View style={styles.infoRow}>
        <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.infoLabel}>Category:</Text>
        <Text style={styles.infoValue}>{listing.category}</Text>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{listing.description}</Text>
      </View>

      {/* Seller Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seller</Text>
        <View style={styles.sellerRow}>
          <View style={styles.sellerAvatar}>
            <Ionicons name="person" size={20} color={colors.backgroundLight} />
          </View>
          <Text style={styles.sellerName}>{getListingSellerName(listing)}</Text>
        </View>
      </View>

      {/* Seller Portfolio (for commission/service categories only) */}
      {sellerPortfolio.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio ({sellerPortfolio.length} {sellerPortfolio.length === 1 ? 'photo' : 'photos'})</Text>
          <Text style={styles.portfolioSubtitle}>Examples of past work</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.portfolioScroll}
            contentContainerStyle={styles.portfolioContent}
          >
            {sellerPortfolio.map((photoUri, index) => (
              <View key={index} style={styles.portfolioCard}>
                <Image source={{ uri: photoUri }} style={styles.portfolioImage} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Listed Date */}
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.infoLabel}>Listed:</Text>
        <Text style={styles.infoValue}>{formattedDate}</Text>
      </View>

      {/* Offer entry point (FE-6 Step 3) */}
      {isEligibleToOffer ? (
        <View style={styles.offerSection}>
          {allowedOfferTypes.map((offerType) => (
            <Button
              key={offerType}
              title={offerButtonLabels[offerType]}
              onPress={handleOfferUnavailable}
              variant="primary"
              fullWidth
            />
          ))}
        </View>
      ) : null}

      {/* Messaging (FE-6 Step 4) */}
      {canMessageSeller ? (
        <Button
          title="Message Seller"
          onPress={handleOfferUnavailable}
          variant="secondary"
          fullWidth
        />
      ) : isSeller ? (
        <Button
          title="View Messages"
          onPress={handleViewMessages}
          variant="secondary"
          fullWidth
        />
      ) : (
        <View style={styles.ineligibleBanner}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.ineligibleText}>
            {!isVerified
              ? 'Only verified marketplace users can message sellers.'
              : listing.status !== 'active'
              ? 'This listing is no longer accepting messages.'
              : 'Messaging is available to buyers and both-role users.'}
          </Text>
        </View>
      )}

      {/* Delete button for owners */}
      {listing.is_owner ? (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setDeleteModalVisible(true)}
          disabled={isDeleting}
        >
          <Ionicons name="trash-outline" size={20} color={colors.surface} />
          <Text style={styles.deleteButtonText}>
            {isDeleting ? 'Deleting...' : 'Delete listing'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Server-bound note: set by either entry point above. */}
      {serverSoonNote ? (
        <View style={styles.ineligibleBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.ineligibleText}>{serverSoonNote}</Text>
        </View>
      ) : null}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete this listing?"
        message="This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteListing}
        onCancel={() => setDeleteModalVisible(false)}
      />

      {/* Error Modal (OK-only: cancelText hidden via empty string) */}
      <ConfirmationModal
        visible={errorVisible}
        title="Something went wrong"
        message={errorMessage}
        confirmText="OK"
        confirmStyle="destructive"
        icon="alert-circle-outline"
        cancelText=""
        onConfirm={() => setErrorVisible(false)}
        onCancel={() => setErrorVisible(false)}
      />
    </ScrollView>
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
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  price: {
    ...typography.h1,
    color: colors.tertiary,
    fontWeight: '700',
  },
  conditionBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  conditionText: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '600',
  },
  transactionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  transactionTypeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  portfolioSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  portfolioScroll: {
    marginHorizontal: -spacing.lg,
  },
  portfolioContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  portfolioCard: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  offerSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ineligibleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  ineligibleText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
    height: 48,
  },
  deleteButtonText: {
    ...typography.buttonText,
    color: colors.surface,
    fontWeight: '600',
  },
  photoGallery: {
    width: '100%',
    height: 300,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  galleryPhoto: {
    height: 300,
  },
  photoIndicator: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.backgroundLight,
    opacity: 0.5,
  },
  indicatorDotActive: {
    opacity: 1,
    backgroundColor: colors.primary,
  },
});
