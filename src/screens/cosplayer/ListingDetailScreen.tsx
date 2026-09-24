/**
 * Listing Detail Screen (FE-6 Steps 1, 3, 4)
 * Shows full listing details with offer buttons and messaging
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { useChat } from '../../contexts/ChatContext';
import { AuthService } from '../../services/AuthService';
import { CONDITION_LABELS } from '../../constants/marketplaceCategories';
import { Button } from '../../components';
import { ConfirmationModal } from '../../components/ConfirmationModal';
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
  const { getOrCreateThread } = useChat();

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sellerPortfolio, setSellerPortfolio] = useState<string[]>([]);

  const listing = getListingById(route.params.listingId);

  // Load seller's portfolio for commission/service listings
  useEffect(() => {
    const loadSellerPortfolio = async () => {
      if (!listing) return;
      
      // Only load portfolio for commission/service categories
      const isCommissionCategory = 
        listing.category === 'Commissions & Crafting Services' ||
        listing.category === 'Photography Services';
      
      if (!isCommissionCategory) return;

      try {
        const accounts = await AuthService.getAccounts();
        const sellerAccount = accounts.find(acc => acc.email === listing.seller_email);
        if (sellerAccount?.portfolio_photos) {
          setSellerPortfolio(sellerAccount.portfolio_photos);
        }
      } catch (error) {
        console.error('Failed to load seller portfolio:', error);
      }
    };

    loadSellerPortfolio();
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
  const isEligibleToOffer =
    user?.verification_status === 'verified' &&
    user?.marketplace_registration?.marketplace_role !== 'seller' &&
    listing.seller_email !== user?.email &&
    listing.status === 'active';
  const allowedOfferTypes = getAllowedOfferTypes(listing.category);

  // FE-6 Step 4: messaging eligibility
  const isVerified = user?.verification_status === 'verified';
  const isSeller = user?.email === listing.seller_email;
  const canMessageSeller =
    isVerified &&
    !isSeller &&
    listing.status === 'active' &&
    user?.marketplace_registration?.marketplace_role !== 'seller';

  const handleMessageSeller = async () => {
    if (!user?.email) return;
    const result = await getOrCreateThread(listing.id, user.email);
    if (result.success && result.thread) {
      navigation.navigate('ChatThread', { threadId: result.thread.id });
    } else {
      setErrorMessage(result.error || 'Failed to start conversation.');
      setErrorVisible(true);
    }
  };

  const handleViewMessages = () => {
    navigation.navigate('ChatList');
  };

  const offerButtonLabels: Record<OfferType, string> = {
    purchase: 'Make Purchase Offer',
    trade: 'Propose Trade',
    commission: 'Request Commission',
  };

  const formattedPrice = listing.transaction_type === 'trade' 
    ? 'Trade Only' 
    : formatPHP(listing.price);
  
  const transactionTypeLabels = {
    buy: 'Buy Only',
    trade: 'Trade Only',
    both: 'Buy or Trade'
  };

  const transactionTypeIcons = {
    buy: 'cash-outline',
    trade: 'swap-horizontal-outline',
    both: 'options-outline'
  };

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
        
        {/* Transaction Type Badge */}
        <View style={styles.transactionTypeBadge}>
          <Ionicons 
            name={transactionTypeIcons[listing.transaction_type] as any} 
            size={16} 
            color={colors.primary} 
          />
          <Text style={styles.transactionTypeText}>
            {transactionTypeLabels[listing.transaction_type]}
          </Text>
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

      {/* Messaging (FE-6 Step 4) */}
      {canMessageSeller ? (
        <Button
          title="Message Seller"
          onPress={handleMessageSeller}
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

      {/* Error Modal */}
      <ConfirmationModal
        visible={errorVisible}
        title="Error"
        message={errorMessage}
        confirmText="OK"
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
});
