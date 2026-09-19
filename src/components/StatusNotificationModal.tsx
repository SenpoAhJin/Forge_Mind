/**
 * StatusNotificationModal
 * Minimalist, casual notification for approval/rejection status
 * Shows approval success or rejection reason with appeal guidance
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';

interface StatusNotificationModalProps {
  visible: boolean;
  onClose: () => void;
  status: 'approved' | 'rejected';
  type: 'marketplace' | 'staff';
  rejectionReason?: string;
  onAppeal?: () => void;
}

export const StatusNotificationModal: React.FC<StatusNotificationModalProps> = ({
  visible,
  onClose,
  status,
  type,
  rejectionReason,
  onAppeal,
}) => {
  const isApproved = status === 'approved';
  const isMarketplace = type === 'marketplace';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={[
            styles.iconCircle,
            isApproved ? styles.iconCircleSuccess : styles.iconCircleError
          ]}>
            <Ionicons
              name={isApproved ? 'checkmark-circle' : 'close-circle'}
              size={48}
              color={isApproved ? colors.success : colors.error}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isApproved
              ? `${isMarketplace ? 'Marketplace' : 'Staff'} Access Approved!`
              : `Application ${isMarketplace ? 'Marketplace' : 'Staff'} Rejected`
            }
          </Text>

          {/* Message */}
          {isApproved ? (
            <Text style={styles.message}>
              {isMarketplace
                ? 'You can now list items, request commissions, and trade in the marketplace.'
                : 'You now have access to your assigned department. Check your profile for details.'
              }
            </Text>
          ) : (
            <View style={styles.rejectionSection}>
              <Text style={styles.rejectionLabel}>Reason for rejection:</Text>
              <ScrollView style={styles.reasonScroll} contentContainerStyle={styles.reasonContent}>
                <Text style={styles.reasonText}>{rejectionReason || 'No reason provided'}</Text>
              </ScrollView>
              <Text style={styles.appealHint}>
                You can update your information and submit a new application, or contact a Head Organizer for clarification.
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!isApproved && onAppeal && (
              <TouchableOpacity
                style={[styles.button, styles.appealButton]}
                onPress={onAppeal}
                activeOpacity={0.7}
              >
                <Text style={styles.appealButtonText}>Update & Resubmit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>
                {isApproved ? 'Got it!' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircleSuccess: {
    backgroundColor: colors.success + '15',
  },
  iconCircleError: {
    backgroundColor: colors.error + '15',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  rejectionSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  rejectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  reasonScroll: {
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonContent: {
    padding: spacing.md,
  },
  reasonText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  appealHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appealButton: {
    backgroundColor: colors.secondary,
  },
  appealButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.backgroundLight,
  },
  closeButton: {
    backgroundColor: colors.primary,
  },
  closeButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.backgroundLight,
  },
});
