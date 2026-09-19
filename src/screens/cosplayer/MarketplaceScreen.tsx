/**
 * Marketplace Screen - Access gated by marketplace registration + verification status
 * 
 * States:
 * 1. No registration submitted → Call-to-action to register
 * 2. Registration submitted, status='pending' → Blocked state (under review)
 * 3. Status='verified' → Full marketplace access (placeholder for FE-6)
 * 4. Status='rejected' or 'revoked' → Allow resubmission with pre-filled data
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';

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

  // State 3: Verified — show placeholder marketplace content (FE-6)
  if (verificationStatus === 'verified') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Ionicons name="cart-outline" size={48} color={colors.tertiary} />
          <Text style={styles.heroTitle}>Marketplace</Text>
          <Text style={styles.heroSub}>
            Buy, sell and trade cosplay items with verified participants.
          </Text>
        </View>

        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Ionicons name="search-outline" size={20} color={colors.tertiary} />
            <Text style={styles.featureText}>Browse items by category, price and condition</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="swap-horizontal-outline" size={20} color={colors.tertiary} />
            <Text style={styles.featureText}>Propose trades with fairness assessment</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="ribbon-outline" size={20} color={colors.tertiary} />
            <Text style={styles.featureText}>Request commissions from skilled crafters</Text>
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={18} color={colors.info} />
          <Text style={styles.infoText}>
            Marketplace browsing, listing creation and chat will be built in FE-6.
          </Text>
        </View>
      </ScrollView>
    );
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
  heroCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.xl,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  heroSub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF5FF',
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
});

