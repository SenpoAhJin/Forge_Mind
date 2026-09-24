/**
 * Commission Progress Screen
 * 
 * Shows milestone timeline for accepted commission offers.
 * Both parties (buyer and crafter) can confirm milestones as they're completed.
 * Displays progress percentage and completion status.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useOffers } from '../../contexts/OffersContext';
import { useCommissionMilestones } from '../../contexts/CommissionMilestonesContext';
import { Button, ConfirmationModal } from '../../components';
import { formatPHP } from '../../utils/formatCurrency';
import { MILESTONE_TYPE_LABELS, MILESTONE_ICONS } from '../../types/commissionMilestones';
import { MarketplaceStackParamList } from '../../navigation/MarketplaceStackNavigator';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';

type CommissionProgressRouteProp = RouteProp<{ params: { offerId: string } }, 'params'>;

const getDynamicStyles = (themeColors: ThemeColors) => ({
  container: { backgroundColor: themeColors.surface },
  title: { color: themeColors.textPrimary },
  subtitle: { color: themeColors.textSecondary },
  summaryCard: { backgroundColor: themeColors.backgroundLight, borderColor: themeColors.border },
  summaryLabel: { color: themeColors.textSecondary },
  summaryValue: { color: themeColors.textPrimary },
  progressBar: { backgroundColor: themeColors.border },
  progressFill: { backgroundColor: themeColors.success },
  progressText: { color: themeColors.textPrimary },
  sectionTitle: { color: themeColors.textPrimary },
  milestoneCard: { backgroundColor: themeColors.backgroundLight, borderColor: themeColors.border },
  milestoneCardPending: { borderLeftColor: themeColors.warning },
  milestoneCardConfirmed: { borderLeftColor: themeColors.success },
  milestoneTitle: { color: themeColors.textPrimary },
  milestoneStatus: { color: themeColors.textSecondary },
  milestoneStatusConfirmed: { color: themeColors.success },
  confirmedBy: { color: themeColors.textDisabled },
  confirmedDate: { color: themeColors.textDisabled },
  infoCard: { backgroundColor: themeColors.info + '10', borderLeftColor: themeColors.info },
  infoText: { color: themeColors.textSecondary },
  completionCard: { backgroundColor: themeColors.success + '10', borderLeftColor: themeColors.success },
  completionTitle: { color: themeColors.success },
  completionText: { color: themeColors.textSecondary },
});

export const CommissionProgressScreen: React.FC = () => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  const navigation = useNavigation<NativeStackNavigationProp<MarketplaceStackParamList>>();
  const route = useRoute<CommissionProgressRouteProp>();
  const { offerId } = route.params;

  const { user } = useUser();
  const { getOfferById } = useOffers();
  const {
    getMilestonesForOffer,
    confirmMilestone,
    getProgressPercentage,
    areAllMilestonesConfirmed,
  } = useCommissionMilestones();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const offer = getOfferById(offerId);
  const milestones = getMilestonesForOffer(offerId);
  const progress = getProgressPercentage(offerId);
  const allConfirmed = areAllMilestonesConfirmed(offerId);

  if (!offer) {
    return (
      <View style={[styles.container, dynamicStyles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={64} color={themeColors.error} />
        <Text style={[styles.title, dynamicStyles.title, { marginTop: spacing.md }]}>Offer Not Found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} variant="primary" />
      </View>
    );
  }

  const isBuyer = user?.email === offer.proposer_email;
  const isCrafter = user?.email === offer.listing_seller_email;

  const handleConfirmPress = (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
    setShowConfirmModal(true);
  };

  const handleConfirmMilestone = async () => {
    if (!selectedMilestoneId || !user?.email) return;

    setIsConfirming(true);
    try {
      const result = await confirmMilestone(selectedMilestoneId, user.email);
      if (result.success) {
        setShowConfirmModal(false);
        setShowSuccessModal(true);
      } else {
        setErrorMessage(result.error || 'Failed to confirm milestone');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage('An error occurred while confirming');
      setShowErrorModal(true);
    } finally {
      setIsConfirming(false);
      setSelectedMilestoneId(null);
    }
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, dynamicStyles.title]}>Commission Progress</Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
          Track milestones and completion status
        </Text>
      </View>

      {/* Summary Card */}
      <View style={[styles.summaryCard, dynamicStyles.summaryCard]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Commission:</Text>
          <Text style={[styles.summaryValue, dynamicStyles.summaryValue]} numberOfLines={2}>
            {offer.commission_description || 'Commission request'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Budget:</Text>
          <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
            {formatPHP(offer.offered_price || 0)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Timeline:</Text>
          <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
            {offer.timeline_days || 0} days
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Overall Progress</Text>
          <Text style={[styles.progressText, dynamicStyles.progressText]}>{progress}%</Text>
        </View>
        <View style={[styles.progressBar, dynamicStyles.progressBar]}>
          <View style={[styles.progressFill, dynamicStyles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Completion Banner */}
      {allConfirmed && (
        <View style={[styles.completionCard, dynamicStyles.completionCard]}>
          <Ionicons name="checkmark-circle" size={24} color={themeColors.success} />
          <View style={styles.completionTextContainer}>
            <Text style={[styles.completionTitle, dynamicStyles.completionTitle]}>Commission Completed!</Text>
            <Text style={[styles.completionText, dynamicStyles.completionText]}>
              All milestones have been confirmed by both parties.
            </Text>
          </View>
        </View>
      )}

      {/* Info Card */}
      <View style={[styles.infoCard, dynamicStyles.infoCard]}>
        <Ionicons name="information-circle-outline" size={16} color={themeColors.info} />
        <Text style={[styles.infoText, dynamicStyles.infoText]}>
          {isBuyer && 'You are the buyer. Confirm milestones as the crafter completes each step.'}
          {isCrafter && 'You are the crafter. Confirm milestones as you complete each step.'}
        </Text>
      </View>

      {/* Milestones */}
      <View style={styles.milestonesSection}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Milestones</Text>
        {milestones.map((milestone, index) => {
          const isConfirmed = milestone.milestone_status === 'confirmed';
          const isPending = milestone.milestone_status === 'pending';
          
          return (
            <View
              key={milestone.milestone_id}
              style={[
                styles.milestoneCard,
                dynamicStyles.milestoneCard,
                isPending && dynamicStyles.milestoneCardPending,
                isConfirmed && dynamicStyles.milestoneCardConfirmed,
              ]}
            >
              {/* Milestone Header */}
              <View style={styles.milestoneHeader}>
                <View style={styles.milestoneIcon}>
                  <Ionicons
                    name={MILESTONE_ICONS[milestone.milestone_type] as any}
                    size={24}
                    color={isConfirmed ? themeColors.success : themeColors.textSecondary}
                  />
                </View>
                <View style={styles.milestoneInfo}>
                  <Text style={[styles.milestoneTitle, dynamicStyles.milestoneTitle]}>
                    {MILESTONE_TYPE_LABELS[milestone.milestone_type]}
                  </Text>
                  <Text style={[
                    styles.milestoneStatus,
                    isConfirmed ? dynamicStyles.milestoneStatusConfirmed : dynamicStyles.milestoneStatus
                  ]}>
                    {isConfirmed ? 'Confirmed' : 'Pending'}
                  </Text>
                </View>
                {isConfirmed && (
                  <Ionicons name="checkmark-circle" size={28} color={themeColors.success} />
                )}
              </View>

              {/* Confirmed Details */}
              {isConfirmed && milestone.confirmed_by_email && milestone.confirmed_at && (
                <View style={styles.confirmedDetails}>
                  <Text style={[styles.confirmedBy, dynamicStyles.confirmedBy]}>
                    Confirmed by {milestone.confirmed_by_email.split('@')[0]}
                  </Text>
                  <Text style={[styles.confirmedDate, dynamicStyles.confirmedDate]}>
                    {formatDate(milestone.confirmed_at)}
                  </Text>
                  {milestone.notes && (
                    <Text style={[styles.confirmedBy, dynamicStyles.confirmedBy, { marginTop: spacing.xs }]}>
                      Note: {milestone.notes}
                    </Text>
                  )}
                </View>
              )}

              {/* Confirm Button */}
              {isPending && (
                <Button
                  title="Confirm Milestone"
                  onPress={() => handleConfirmPress(milestone.milestone_id)}
                  variant="secondary"
                  fullWidth
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Confirm Milestone?"
        message="Mark this milestone as completed? This action cannot be undone."
        confirmText={isConfirming ? 'Confirming...' : 'Confirm'}
        cancelText="Cancel"
        onConfirm={handleConfirmMilestone}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedMilestoneId(null);
        }}
      />

      {/* Success Modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        title="Milestone Confirmed"
        message="The milestone has been marked as completed."
        confirmText="OK"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />

      {/* Error Modal */}
      <ConfirmationModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        onConfirm={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    ...typography.body,
    fontWeight: '600',
    width: '35%',
  },
  summaryValue: {
    ...typography.body,
    flex: 1,
    textAlign: 'right',
  },
  progressSection: {
    marginBottom: spacing.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
  },
  progressText: {
    ...typography.h3,
    fontWeight: '700',
  },
  progressBar: {
    height: 12,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  completionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    marginBottom: spacing.xl,
  },
  completionTextContainer: {
    flex: 1,
  },
  completionTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  completionText: {
    ...typography.body,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    marginBottom: spacing.xl,
  },
  infoText: {
    ...typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  milestonesSection: {
    gap: spacing.md,
  },
  milestoneCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: spacing.md,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    ...typography.h3,
  },
  milestoneStatus: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
  confirmedDetails: {
    paddingLeft: spacing.lg + 40,
  },
  confirmedBy: {
    ...typography.caption,
  },
  confirmedDate: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
});
