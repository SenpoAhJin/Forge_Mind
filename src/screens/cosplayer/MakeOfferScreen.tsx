/**
 * Make Offer Screen (FE-6 Step 3)
 * Structured purchase / trade / commission offers, gated by role + listing state.
 * Price/fairness suggestions are explicitly out of scope (AI layer later).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { useOffers } from '../../contexts/OffersContext';
import { AuthService } from '../../services/AuthService';
import { TextInputField, TextAreaField, Button, ConfirmationModal } from '../../components';
import { CONDITION_LABELS } from '../../constants/marketplaceCategories';
import { OfferType } from '../../types/offers';
import { MarketplaceCondition } from '../../types/marketplace';
import { isOfferTypeAllowed } from '../../utils/offerRules';
import { formatOfferType } from '../../utils/formatStatus';
import { formatPHP } from '../../utils/formatCurrency';
import { MarketplaceStackParamList } from '../../navigation/MarketplaceStackNavigator';

type MakeOfferRouteProp = RouteProp<
  { params: { listingId: string; offerType: OfferType } },
  'params'
>;

export const MakeOfferScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MarketplaceStackParamList>>();
  const route = useRoute<MakeOfferRouteProp>();
  const { listingId, offerType } = route.params;

  const { user } = useUser();
  const { getListingById } = useMarketplace();
  const { createOffer } = useOffers();

  const [offeredPrice, setOfferedPrice] = useState('');
  const [tradeItem, setTradeItem] = useState('');
  const [tradeCondition, setTradeCondition] = useState('');
  const [tradeEstValue, setTradeEstValue] = useState('');
  const [commissionDescription, setCommissionDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');

  const [priceError, setPriceError] = useState('');
  const [itemError, setItemError] = useState('');
  const [estValueError, setEstValueError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [timelineError, setTimelineError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sellerPortfolio, setSellerPortfolio] = useState<string[]>([]);

  const listing = getListingById(listingId);

  // Load seller's portfolio for commission offers
  useEffect(() => {
    const loadSellerPortfolio = async () => {
      if (!listing || offerType !== 'commission') return;

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
  }, [listing, offerType]);

  const isSeller = user ? listing?.seller_email === user.email : false;
  const roleIsSellerOnly = user?.marketplace_registration?.marketplace_role === 'seller';
  const isVerified = user?.verification_status === 'verified';
  const listingIsActive = listing?.status === 'active';
  const typeAllowed = listing ? isOfferTypeAllowed(listing.category, offerType) : false;

  // Route-level guard: the acting user must be a verified, non-seller
  // participant on an active listing that allows this offer type.
  if (
    !user ||
    !listing ||
    !isVerified ||
    isSeller ||
    roleIsSellerOnly ||
    !listingIsActive ||
    !typeAllowed
  ) {
    let reason = 'You are not able to make this offer right now.';
    if (isSeller) {
      reason = 'You cannot make an offer on your own listing.';
    } else if (roleIsSellerOnly) {
      reason = 'Seller-only accounts cannot make offers. They can only receive them.';
    } else if (listing && !listingIsActive) {
      reason = 'This listing is no longer accepting offers.';
    } else if (listing && !typeAllowed) {
      reason = 'This offer type is not available for this listing.';
    } else if (!isVerified) {
      reason = 'Your marketplace registration must be verified to send offers.';
    }

    return (
      <BlockedView
        reason={reason}
        onBack={() => navigation.goBack()}
      />
    );
  }

  const clearingErrors = (): void => {
    setPriceError('');
    setItemError('');
    setEstValueError('');
    setDescriptionError('');
    setBudgetError('');
    setTimelineError('');
    setGlobalError('');
  };

  const validateFields = (): boolean => {
    clearingErrors();
    let isValid = true;

    if (offerType === 'purchase') {
      const priceNum = parseFloat(offeredPrice);
      if (!offeredPrice.trim() || isNaN(priceNum) || priceNum <= 0) {
        setPriceError('Enter an offer price greater than 0');
        isValid = false;
      }
    }

    if (offerType === 'trade') {
      if (tradeItem.trim().length < 3) {
        setItemError('Describe the item you are offering (at least 3 characters)');
        isValid = false;
      }
      if (!tradeCondition) {
        setItemError(tradeItem.trim().length < 3
          ? 'Describe the item and select a condition'
          : 'Select the condition of your item');
        isValid = false;
      }
      if (tradeEstValue.trim()) {
        const estNum = parseFloat(tradeEstValue);
        if (isNaN(estNum) || estNum <= 0) {
          setEstValueError('Estimated value must be greater than 0');
          isValid = false;
        }
      }
    }

    if (offerType === 'commission') {
      if (commissionDescription.trim().length < 3) {
        setDescriptionError('Describe what you want made or done (at least 3 characters)');
        isValid = false;
      }
      const budgetNum = parseFloat(budget);
      if (!budget.trim() || isNaN(budgetNum) || budgetNum <= 0) {
        setBudgetError('Enter a budget greater than 0');
        isValid = false;
      }
      const timelineNum = Number(timeline);
      if (!timeline.trim() || !/^\d+$/.test(timeline) || timelineNum < 1 || timelineNum > 365) {
        setTimelineError('Enter a timeline between 1 and 365 days');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateFields()) {
      setGlobalError('Please fix the errors above');
      return;
    }
    if (!user?.email) {
      setGlobalError('User email not found');
      return;
    }

    const input = {
      listing_id: listing.id,
      offer_type: offerType,
      offered_price: offerType === 'purchase' ? parseFloat(offeredPrice) : offerType === 'commission' ? parseFloat(budget) : undefined,
      trade_offered_item: offerType === 'trade' ? tradeItem.trim() : undefined,
      trade_offered_condition: offerType === 'trade' ? (tradeCondition as MarketplaceCondition) : undefined,
      trade_offered_est_value: offerType === 'trade' && tradeEstValue.trim() ? parseFloat(tradeEstValue) : undefined,
      commission_description: offerType === 'commission' ? commissionDescription.trim() : undefined,
      timeline_days: offerType === 'commission' ? Number(timeline) : undefined,
    };

    setIsLoading(true);
    try {
      const result = await createOffer(user.email, input);
      if (result.success) {
        setSuccessVisible(true);
      } else {
        setErrorMessage(result.error ?? 'Failed to send the offer. Please try again.');
        setErrorVisible(true);
      }
    } catch (error) {
      setErrorMessage('Failed to send the offer. Please try again.');
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessDone = () => {
    setSuccessVisible(false);
    navigation.navigate('OfferLog', { initialTab: 'sent' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="paper-plane-outline" size={32} color={colors.tertiary} />
          <Text style={styles.headerTitle}>{formatOfferType(offerType)}</Text>
          <Text style={styles.headerSubtitle}>
            Send a structured offer to the seller
          </Text>
        </View>

        {/* Listing summary (read-only) */}
        <View style={styles.listingCard}>
          <Text style={styles.listingLabel}>Listing</Text>
          <Text style={styles.listingTitle}>{listing.title}</Text>
          <Text style={styles.listingPrice}>{formatPHP(listing.price)}</Text>
        </View>

        {/* Seller Portfolio (commission offers only) */}
        {offerType === 'commission' && sellerPortfolio.length > 0 && (
          <View style={styles.portfolioSection}>
            <Text style={styles.portfolioTitle}>Crafter's Portfolio</Text>
            <Text style={styles.portfolioSubtitle}>
              {sellerPortfolio.length} {sellerPortfolio.length === 1 ? 'example' : 'examples'} of past work
            </Text>
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

        {/* Form */}
        <View style={styles.form}>
          {offerType === 'purchase' && (
            <TextInputField
              label="Offer price (₱) *"
              value={offeredPrice}
              onChangeText={setOfferedPrice}
              placeholder="0.00"
              keyboardType="numeric"
              error={priceError}
            />
          )}

          {offerType === 'trade' && (
            <>
              <TextInputField
                label="Item you're offering *"
                value={tradeItem}
                onChangeText={setTradeItem}
                placeholder="e.g., Miku Hatsune wig, size M"
                error={itemError}
              />
              <View style={styles.field}>
                <Text style={styles.label}>Condition of the offered item *</Text>
                <View style={styles.chipContainer}>
                  {Object.keys(CONDITION_LABELS).map((cond) => (
                    <TouchableOpacity
                      key={cond}
                      style={[
                        styles.chip,
                        tradeCondition === cond && styles.chipSelected,
                      ]}
                      onPress={() => {
                        setTradeCondition(cond);
                        setItemError('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.chipText,
                        tradeCondition === cond && styles.chipTextSelected,
                      ]}>
                        {CONDITION_LABELS[cond]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {itemError ? <Text style={styles.errorText}>{itemError}</Text> : null}
              </View>
              <TextInputField
                label="Estimated value (₱)"
                value={tradeEstValue}
                onChangeText={setTradeEstValue}
                placeholder="Optional"
                keyboardType="numeric"
                error={estValueError}
              />
            </>
          )}

          {offerType === 'commission' && (
            <>
              <TextAreaField
                label="What do you want made or done? *"
                value={commissionDescription}
                onChangeText={setCommissionDescription}
                placeholder="Describe the commission: item, size, materials, deadline..."
                error={descriptionError}
                minRows={5}
              />
              <TextInputField
                label="Budget (₱) *"
                value={budget}
                onChangeText={setBudget}
                placeholder="0.00"
                keyboardType="numeric"
                error={budgetError}
              />
              <TextInputField
                label="Timeline (days) *"
                value={timeline}
                onChangeText={setTimeline}
                placeholder="e.g., 14"
                keyboardType="numeric"
                error={timelineError}
              />
            </>
          )}

          {/* AI-layer notice */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text style={styles.infoText}>
              Price and fairness suggestions will arrive with the AI layer in a later phase.
              Offers are not checked against the Value Reference yet.
            </Text>
          </View>

          {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={isLoading ? 'Sending...' : 'Send Offer'}
          onPress={handleSubmit}
          variant="primary"
          fullWidth
          disabled={isLoading}
        />
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loadingIndicator}
          />
        )}
      </View>

      <ConfirmationModal
        visible={successVisible}
        title="Offer Sent"
        message="Your offer has been sent to the seller. Track it in your Offer Log."
        confirmText="OK"
        cancelText=""
        onConfirm={handleSuccessDone}
        onCancel={handleSuccessDone}
      />

      <ConfirmationModal
        visible={errorVisible}
        title="Couldn't send offer"
        message={errorMessage}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setErrorVisible(false)}
        onCancel={() => setErrorVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const BlockedView: React.FC<{ reason: string; onBack: () => void }> = ({ reason, onBack }) => {
  return (
    <View style={styles.blockedContainer}>
      <View style={styles.blockedCard}>
        <View style={styles.blockedIcon}>
          <Ionicons name="lock-closed-outline" size={64} color={colors.textSecondary} />
        </View>
        <Text style={styles.blockedTitle}>Can't make this offer</Text>
        <Text style={styles.blockedText}>{reason}</Text>
        <Button title="Back" onPress={onBack} variant="primary" fullWidth />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  listingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  listingLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  listingTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  listingPrice: {
    ...typography.body,
    color: colors.tertiary,
    fontWeight: '700',
  },
  portfolioSection: {
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  portfolioTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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
    width: 120,
    height: 120,
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
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.tertiary,
    borderColor: colors.tertiary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.backgroundLight,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
  },
  globalError: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    backgroundColor: colors.error + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  loadingIndicator: {
    marginTop: spacing.sm,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  blockedCard: {
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
    gap: spacing.md,
  },
  blockedIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.textDisabled + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  blockedText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
});