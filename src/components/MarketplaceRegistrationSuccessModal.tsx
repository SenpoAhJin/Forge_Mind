/**
 * MarketplaceRegistrationSuccessModal
 * Dedicated success modal for marketplace registration (distinct from account creation)
 * Shows submission recap and pending review status
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';

interface MarketplaceRegistrationSuccessModalProps {
  visible: boolean;
  marketplaceRole: 'buyer' | 'seller' | 'both';
  sellerDisplayName: string;
  contactEmail: string;
  contactPhone?: string;
  payoutMethodLabel?: string;
  onBackToMarketplace: () => void;
  onEditSubmission: () => void;
}

export const MarketplaceRegistrationSuccessModal: React.FC<MarketplaceRegistrationSuccessModalProps> = ({
  visible,
  marketplaceRole,
  sellerDisplayName,
  contactEmail,
  contactPhone,
  payoutMethodLabel,
  onBackToMarketplace,
  onEditSubmission,
}) => {
  const roleLabel =
    marketplaceRole === 'buyer'
      ? 'Buyer'
      : marketplaceRole === 'seller'
      ? 'Seller'
      : 'Buyer & Seller';

  const requiresPayoutInfo = marketplaceRole === 'seller' || marketplaceRole === 'both';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onBackToMarketplace}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.modal}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={colors.tertiary} />
              </View>
              <Text style={styles.title}>Marketplace Registration Submitted</Text>
              <Text style={styles.subtitle}>
                Your application is now pending review by a Head Organizer. You'll be notified once it's approved.
              </Text>
            </View>

            {/* Submission recap */}
            <View style={styles.recapSection}>
              <Text style={styles.recapTitle}>Submission Summary</Text>

              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Role</Text>
                <Text style={styles.recapValue}>{roleLabel}</Text>
              </View>

              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Display Name</Text>
                <Text style={styles.recapValue}>{sellerDisplayName}</Text>
              </View>

              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Contact Email</Text>
                <Text style={styles.recapValue}>{contactEmail}</Text>
              </View>

              {contactPhone ? (
                <View style={styles.recapRow}>
                  <Text style={styles.recapLabel}>Contact Phone</Text>
                  <Text style={styles.recapValue}>{contactPhone}</Text>
                </View>
              ) : null}

              {requiresPayoutInfo && payoutMethodLabel ? (
                <View style={styles.recapRow}>
                  <Text style={styles.recapLabel}>Payout Method</Text>
                  <Text style={styles.recapValue}>{payoutMethodLabel}</Text>
                </View>
              ) : null}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={onBackToMarketplace}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>Back to Marketplace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onEditSubmission}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Edit Submission</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modal: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.tertiary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  recapSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  recapTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recapLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  recapValue: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.tertiary,
  },
  primaryButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.backgroundLight,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
