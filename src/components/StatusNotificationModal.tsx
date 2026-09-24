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
import { typography, spacing, borderRadius } from '../theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

interface StatusNotificationModalProps {
  visible: boolean;
  onClose: () => void;
  status: 'approved' | 'rejected';
  type: 'marketplace' | 'staff';
  rejectionReason?: string;
  onAppeal?: () => void;
}

const getDynamicStyles = (themeColors: ThemeColors) => ({
  container: { backgroundColor: themeColors.backgroundLight },
  iconCircleSuccess: { backgroundColor: themeColors.success + '15' },
  iconCircleError: { backgroundColor: themeColors.error + '15' },
  title: { color: themeColors.textPrimary },
  message: { color: themeColors.textSecondary },
  rejectionLabel: { color: themeColors.textSecondary },
  reasonScroll: { backgroundColor: themeColors.surface, borderColor: themeColors.border },
  reasonText: { color: themeColors.textPrimary },
  appealHint: { color: themeColors.textSecondary },
  appealButton: { backgroundColor: themeColors.secondary },
  appealButtonText: { color: themeColors.backgroundLight },
  closeButton: { backgroundColor: themeColors.primary },
  closeButtonText: { color: themeColors.backgroundLight },
});

export const StatusNotificationModal: React.FC<StatusNotificationModalProps> = ({
  visible,
  onClose,
  status,
  type,
  rejectionReason,
  onAppeal,
}) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  
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
        <View style={[styles.container, dynamicStyles.container]}>
          {/* Icon */}
          <View style={[
            styles.iconCircle,
            isApproved ? dynamicStyles.iconCircleSuccess : dynamicStyles.iconCircleError
          ]}>
            <Ionicons
              name={isApproved ? 'checkmark-circle' : 'close-circle'}
              size={48}
              color={isApproved ? themeColors.success : themeColors.error}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, dynamicStyles.title]}>
            {isApproved
              ? `${isMarketplace ? 'Marketplace' : 'Staff'} Access Approved!`
              : `Application ${isMarketplace ? 'Marketplace' : 'Staff'} Rejected`
            }
          </Text>

          {/* Message */}
          {isApproved ? (
            <Text style={[styles.message, dynamicStyles.message]}>
              {isMarketplace
                ? 'You can now list items, request commissions, and trade in the marketplace.'
                : 'You now have access to your assigned department. Check your profile for details.'
              }
            </Text>
          ) : (
            <View style={styles.rejectionSection}>
              <Text style={[styles.rejectionLabel, dynamicStyles.rejectionLabel]}>Reason for rejection:</Text>
              <ScrollView style={[styles.reasonScroll, dynamicStyles.reasonScroll]} contentContainerStyle={styles.reasonContent}>
                <Text style={[styles.reasonText, dynamicStyles.reasonText]}>{rejectionReason || 'No reason provided'}</Text>
              </ScrollView>
              <Text style={[styles.appealHint, dynamicStyles.appealHint]}>
                You can update your information and submit a new application, or contact a Head Organizer for clarification.
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!isApproved && onAppeal && (
              <TouchableOpacity
                style={[styles.button, styles.appealButton, dynamicStyles.appealButton]}
                onPress={onAppeal}
                activeOpacity={0.7}
              >
                <Text style={[styles.appealButtonText, dynamicStyles.appealButtonText]}>Update & Resubmit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.closeButton, dynamicStyles.closeButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>
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
  iconCircleSuccess: {},
  iconCircleError: {},
  title: {
    ...typography.h2,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  reasonScroll: {
    maxHeight: 120,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  reasonContent: {
    padding: spacing.md,
  },
  reasonText: {
    ...typography.body,
    lineHeight: 22,
  },
  appealHint: {
    ...typography.caption,
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
  appealButton: {},
  appealButtonText: {
    ...typography.body,
    fontWeight: '700',
  },
  closeButton: {},
  closeButtonText: {
    ...typography.body,
    fontWeight: '700',
  },
});
