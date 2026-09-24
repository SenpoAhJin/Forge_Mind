/**
 * Offer Detail Screen (FE-6 Steps 3, 4)
 * Full read-out of a structured offer with accept/decline/withdraw actions and messaging
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useOffers } from '../../contexts/OffersContext';
import { useChat } from '../../contexts/ChatContext';
import { useCommissionMilestones } from '../../contexts/CommissionMilestonesContext';
import { Button, ConfirmationModal } from '../../components';
import { OfferStatus } from '../../types/offers';
import { CONDITION_LABELS } from '../../constants/marketplaceCategories';
import { formatOfferStatus, formatOfferType } from '../../utils/formatStatus';
import { formatPHP } from '../../utils/formatCurrency';
import { MarketplaceStackParamList } from '../../navigation/MarketplaceStackNavigator';

type OfferDetailRouteProp = RouteProp<
  { params: { offerId: string } },
  'params'
>;

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

export const OfferDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MarketplaceStackParamList>>();
  const route = useRoute<OfferDetailRouteProp>();
  const { user } = useUser();
  const { getOfferById, acceptOffer, declineOffer, withdrawOffer } = useOffers();
  const { getOrCreateThread } = useChat();
  const { createMilestonesForOffer, getProgressPercentage } = useCommissionMilestones();

  const [confirmAcceptVisible, setConfirmAcceptVisible] = useState(false);
  const [confirmDeclineVisible, setConfirmDeclineVisible] = useState(false);
  const [confirmWithdrawVisible, setConfirmWithdrawVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const offer = getOfferById(route.params.offerId);

  // Auto-create milestones when commission offer is accepted
  useEffect(() => {
    const initializeMilestones = async () => {
      if (offer && offer.offer_type === 'commission' && offer.status === 'accepted') {
        await createMilestonesForOffer(offer);
      }
    };
    initializeMilestones();
  }, [offer?.status, offer?.offer_type]);

  if (!offer) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorTitle}>Offer Not Found</Text>
        <Text style={styles.errorText}>
          This offer may have been removed or is no longer available.
        </Text>
        <Button
          title="Back to Offers"
          onPress={() => navigation.goBack()}
          variant="primary"
        />
      </View>
    );
  }

  const isRecipient = user?.email === offer.listing_seller_email;
  const isProposer = user?.email === offer.proposer_email;
  const isPending = offer.status === 'pending';
  const isParticipant = isRecipient || isProposer;
  const isVerified = user?.verification_status === 'verified';

  const handleMessage = async () => {
    if (!user?.email || !isParticipant) return;
    const buyerEmail = offer.proposer_email;
    const result = await getOrCreateThread(offer.listing_id, buyerEmail);
    if (result.success && result.thread) {
      navigation.navigate('ChatThread', { threadId: result.thread.id });
    } else {
      setErrorMessage(result.error || 'Failed to open conversation.');
      setErrorVisible(true);
    }
  };

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const runAction = async (action: 'accept' | 'decline' | 'withdraw') => {
    setIsProcessing(true);
    try {
      const result = action === 'accept'
        ? await acceptOffer(offer.id, user?.email ?? '')
        : action === 'decline'
          ? await declineOffer(offer.id, user?.email ?? '')
          : await withdrawOffer(offer.id, user?.email ?? '');

      if (result.success) {
        if (action === 'accept') {
          setSuccessTitle('Offer Accepted');
          setSuccessMessage('Great! This offer has been accepted. Agree on payment and delivery details directly with the proposer.');
        } else if (action === 'decline') {
          setSuccessTitle('Offer Declined');
          setSuccessMessage('The offer has been declined. The proposer will be able to see the updated status.');
        } else {
          setSuccessTitle('Offer Withdrawn');
          setSuccessMessage('Your offer has been withdrawn and is no longer active.');
        }
        setSuccessVisible(true);
      } else {
        setErrorMessage(result.error ?? 'Something went wrong. Please try again.');
        setErrorVisible(true);
      }
    } catch (error) {
      setErrorMessage('Something went wrong. Please try again.');
      setErrorVisible(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptConfirm = () => {
    setConfirmAcceptVisible(false);
    runAction('accept');
  };

  const handleDeclineConfirm = () => {
    setConfirmDeclineVisible(false);
    runAction('decline');
  };

  const handleWithdrawConfirm = () => {
    setConfirmWithdrawVisible(false);
    runAction('withdraw');
  };

  const statusBadgeColor = statusColor(offer.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor + '15' }]}>
          <Text style={[styles.statusBadgeText, { color: statusBadgeColor }]}>
            {formatOfferStatus(offer.status)}
          </Text>
        </View>
        <Text style={styles.typeLabel}>{formatOfferType(offer.offer_type)}</Text>
      </View>

      {/* Listing snapshot */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>LISTING</Text>
        <Text style={styles.listingTitle}>{offer.listing_title}</Text>
        <Text style={styles.askingPrice}>Asking price: {formatPHP(offer.listing_price)}</Text>
      </View>

      {/* Offer details */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>OFFER</Text>

        {offer.offer_type === 'purchase' && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Offered price</Text>
            <Text style={styles.rowValue}>{formatPHP(offer.offered_price ?? 0)}</Text>
          </View>
        )}

        {offer.offer_type === 'trade' && (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Trade item</Text>
              <Text style={styles.rowValue}>{offer.trade_offered_item ?? '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Item condition</Text>
              <Text style={styles.rowValue}>
                {offer.trade_offered_condition ? CONDITION_LABELS[offer.trade_offered_condition] : '—'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Est. value</Text>
              <Text style={styles.rowValue}>
                {offer.trade_offered_est_value !== undefined
                  ? formatPHP(offer.trade_offered_est_value)
                  : 'Not provided'}
              </Text>
            </View>
          </>
        )}

        {offer.offer_type === 'commission' && (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Request</Text>
              <Text style={styles.rowValue}>{offer.commission_description ?? '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Budget</Text>
              <Text style={styles.rowValue}>{formatPHP(offer.offered_price ?? 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Timeline</Text>
              <Text style={styles.rowValue}>{offer.timeline_days ?? '—'} day(s)</Text>
            </View>
          </>
        )}

        {!isPending && offer.responded_at && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Responded</Text>
            <Text style={styles.rowValue}>{formatDate(offer.responded_at)}</Text>
          </View>
        )}
      </View>

      {/* Parties */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>PARTIES</Text>
        <View style={styles.row}>
          <Text style={styles.partyRole}>From</Text>
          <View style={styles.partyInfo}>
            <Text style={styles.partyName}>{offer.proposer_display_name}</Text>
            <Text style={styles.partyEmail}>{offer.proposer_email}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.partyRole}>To</Text>
          <View style={styles.partyInfo}>
            <Text style={styles.partyName}>{offer.seller_display_name}</Text>
            <Text style={styles.partyEmail}>{offer.listing_seller_email}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Sent</Text>
          <Text style={styles.rowValue}>{formatDate(offer.created_at)}</Text>
        </View>
      </View>

      {/* Payment / shipping note */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color={colors.info} />
        <Text style={styles.infoText}>
          ForgeMind does not process payment or shipping. Arrange payment and delivery directly
          with the other party.
        </Text>
      </View>

      {/* Actions */}
      {isPending && isRecipient && (
        <View style={styles.actions}>
          <Button
            title="Decline"
            onPress={() => setConfirmDeclineVisible(true)}
            variant="destructive"
            style={styles.actionButton}
            disabled={isProcessing}
          />
          <Button
            title="Accept"
            onPress={() => setConfirmAcceptVisible(true)}
            variant="primary"
            style={styles.actionButton}
            loading={isProcessing}
          />
        </View>
      )}

      {isPending && isProposer && !isRecipient && (
        <View style={styles.actions}>
          <Button
            title="Withdraw Offer"
            onPress={() => setConfirmWithdrawVisible(true)}
            variant="secondary"
            fullWidth
            disabled={isProcessing}
          />
        </View>
      )}

      {!isPending && (
        <View style={styles.readOnlyNote}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.readOnlyText}>
            This offer was {formatOfferStatus(offer.status).toLowerCase()} and is no longer
            awaiting a response.
          </Text>
        </View>
      )}

      {/* Message button (FE-6 Step 4) */}
      {isVerified && isParticipant && (
        <View style={styles.messageButtonContainer}>
          <Button
            title="Message"
            onPress={handleMessage}
            variant="secondary"
            fullWidth
          />
        </View>
      )}

      {/* Track Progress button (Commission Milestones) */}
      {offer.offer_type === 'commission' && offer.status === 'accepted' && isParticipant && (
        <View style={styles.messageButtonContainer}>
          <Button
            title={`Track Progress (${getProgressPercentage(offer.id)}% Complete)`}
            onPress={() => navigation.navigate('CommissionProgress', { offerId: offer.id })}
            variant="primary"
            fullWidth
          />
        </View>
      )}

      {/* Confirmations */}
      <ConfirmationModal
        visible={confirmAcceptVisible}
        title="Accept this offer?"
        message="Accepting creates a final agreement with the proposer. You will handle payment and delivery directly."
        confirmText="Accept"
        onConfirm={handleAcceptConfirm}
        onCancel={() => setConfirmAcceptVisible(false)}
      />
      <ConfirmationModal
        visible={confirmDeclineVisible}
        title="Decline this offer?"
        message="The proposer will see this offer as declined and it can no longer be accepted."
        confirmText="Decline"
        confirmStyle="destructive"
        onConfirm={handleDeclineConfirm}
        onCancel={() => setConfirmDeclineVisible(false)}
      />
      <ConfirmationModal
        visible={confirmWithdrawVisible}
        title="Withdraw this offer?"
        message="Withdrawing cancels your offer. The seller will no longer be able to respond to it."
        confirmText="Withdraw"
        onConfirm={handleWithdrawConfirm}
        onCancel={() => setConfirmWithdrawVisible(false)}
      />
      <ConfirmationModal
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        confirmText="OK"
        onConfirm={() => setSuccessVisible(false)}
        onCancel={() => setSuccessVisible(false)}
      />
      <ConfirmationModal
        visible={errorVisible}
        title="Something went wrong"
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
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  typeLabel: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textDisabled,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  listingTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  askingPrice: {
    ...typography.body,
    color: colors.tertiary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  rowValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  partyRole: {
    ...typography.body,
    color: colors.textSecondary,
    width: 64,
  },
  partyInfo: {
    flex: 1,
  },
  partyName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  partyEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.caption,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  readOnlyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  readOnlyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  messageButtonContainer: {
    marginTop: spacing.md,
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