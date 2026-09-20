/**
 * Listing Detail Screen (FE-6 Step 1)
 * Shows full listing details
 * Contact seller button is disabled/coming soon (Step 4 will add chat)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { CONDITION_LABELS } from '../../constants/marketplaceCategories';
import { Button } from '../../components';
import { formatPHP } from '../../utils/formatCurrency';
import { getAllowedOfferTypes } from '../../utils/offerRules';
import { OfferType } from '../../types/offers';
import { MarketplaceStackParamList } from '../../navigation/MarketplaceStackNavigator';

type ListingDetailRouteProp = RouteProp<{ params: { listingId: string } }, 'params'>;

export const ListingDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MarketplaceStackParamList>>();
  const route = useRoute<ListingDetailRouteProp>();
  const { user } = useUser();
  const { getListingById } = useMarketplace();

  const listing = getListingById(route.params.listingId);

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
  const isEligibleToOffer =
    user?.verification_status === 'verified' &&
    user?.marketplace_registration?.marketplace_role !== 'seller' &&
    listing.seller_email !== user?.email &&
    listing.status === 'active';
  const allowedOfferTypes = getAllowedOfferTypes(listing.category);

  const offerButtonLabels: Record<OfferType, string> = {
    purchase: 'Make Purchase Offer',
    trade: 'Propose Trade',
    commission: 'Request Commission',
  };

  const formattedPrice = formatPHP(listing.price);
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
      </View>

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
          <Text style={styles.sellerName}>{listing.seller_email.split('@')[0]}</Text>
        </View>
      </View>

      {/* Listed Date */}
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.infoLabel}>Listed:</Text>
        <Text style={styles.infoValue}>{formattedDate}</Text>
      </View>

      {/* Offer entry point (FE-6 Step 3) */}
      {isEligibleToOffer && (
        <View style={styles.offerSection}>
          {allowedOfferTypes.map((offerType) => (
            <Button
              key={offerType}
              title={offerButtonLabels[offerType]}
              onPress={() =>
                navigation.navigate('MakeOffer', {
                  listingId: listing.id,
                  offerType,
                })
              }
              variant="primary"
              fullWidth
            />
          ))}
        </View>
      )}

      {/* Coming Soon Banner */}
      <View style={styles.comingSoonBanner}>
        <Ionicons name="information-circle" size={18} color={colors.info} />
        <Text style={styles.comingSoonText}>
          Direct messaging between participants will be available in a later update (FE-6 Step 4).
        </Text>
      </View>

      {/* Contact Seller Button (Disabled) */}
      <Button
        title="Contact Seller (Coming Soon)"
        onPress={() => {}}
        variant="primary"
        fullWidth
        disabled={true}
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
  offerSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  comingSoonBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  comingSoonText: {
    ...typography.caption,
    color: colors.info,
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
});
