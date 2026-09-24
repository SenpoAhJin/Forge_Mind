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
import { typography, spacing, borderRadius } from '../theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

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

const getDynamicStyles = (themeColors: ThemeColors) => ({
  modal: { backgroundColor: themeColors.backgroundLight },
  title: { color: themeColors.accent },
  subtitle: { color: themeColors.textSecondary },
  recapSection: { backgroundColor: themeColors.surface },
  recapTitle: { color: themeColors.textPrimary },
  recapRow: { borderBottomColor: themeColors.border },
  recapLabel: { color: themeColors.textSecondary },
  recapValue: { color: themeColors.textPrimary },
  primaryButton: { backgroundColor: themeColors.accent },
  primaryButtonText: { color: themeColors.backgroundLight },
  secondaryButton: { backgroundColor: themeColors.surface, borderColor: themeColors.border },
  secondaryButtonText: { color: themeColors.textSecondary },
});

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
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  
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
            contentContainerStyle={[styles.modal, dynamicStyles.modal]}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={themeColors.accent} />
              </View>
              <Text style={[styles.title, dynamicStyles.title]}>Marketplace Registration Submitted</Text>
              <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                Your application is now pending review by a Head Organizer. You'll be notified once it's approved.
              </Text>
            </View>

            {/* Submission recap */}
            <View style={[styles.recapSection, dynamicStyles.recapSection]}>
              <Text style={[styles.recapTitle, dynamicStyles.recapTitle]}>Submission Summary</Text>

              <View style={[styles.recapRow, dynamicStyles.recapRow]}>
                <Text style={[styles.recapLabel, dynamicStyles.recapLabel]}>Role</Text>
                <Text style={[styles.recapValue, dynamicStyles.recapValue]}>{roleLabel}</Text>
              </View>

              <View style={[styles.recapRow, dynamicStyles.recapRow]}>
                <Text style={[styles.recapLabel, dynamicStyles.recapLabel]}>Display Name</Text>
                <Text style={[styles.recapValue, dynamicStyles.recapValue]}>{sellerDisplayName}</Text>
              </View>

              <View style={[styles.recapRow, dynamicStyles.recapRow]}>
                <Text style={[styles.recapLabel, dynamicStyles.recapLabel]}>Contact Email</Text>
                <Text style={[styles.recapValue, dynamicStyles.recapValue]}>{contactEmail}</Text>
              </View>

              {contactPhone ? (
                <View style={[styles.recapRow, dynamicStyles.recapRow]}>
                  <Text style={[styles.recapLabel, dynamicStyles.recapLabel]}>Contact Phone</Text>
                  <Text style={[styles.recapValue, dynamicStyles.recapValue]}>{contactPhone}</Text>
                </View>
              ) : null}

              {requiresPayoutInfo && payoutMethodLabel ? (
                <View style={[styles.recapRow, dynamicStyles.recapRow]}>
                  <Text style={[styles.recapLabel, dynamicStyles.recapLabel]}>Payout Method</Text>
                  <Text style={[styles.recapValue, dynamicStyles.recapValue]}>{payoutMethodLabel}</Text>
                </View>
              ) : null}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, dynamicStyles.primaryButton]}
                onPress={onBackToMarketplace}
                activeOpacity={0.7}
              >
                <Text style={[styles.primaryButtonText, dynamicStyles.primaryButtonText]}>Back to Marketplace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, dynamicStyles.secondaryButton]}
                onPress={onEditSubmission}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, dynamicStyles.secondaryButtonText]}>Edit Submission</Text>
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
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  recapSection: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  recapTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  recapLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  recapValue: {
    ...typography.body,
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
  primaryButton: {},
  primaryButtonText: {
    ...typography.body,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
});
