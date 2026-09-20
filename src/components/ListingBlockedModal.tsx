/**
 * ListingBlockedModal
 * Shown to a seller when a freshly submitted listing fails the
 * permitted-category screener (FE-6 Step 2). The listing was persisted as
 * 'blocked' (never public); this modal explains why and offers two paths:
 * edit & resubmit, or appeal the decision.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';

interface ListingBlockedModalProps {
  visible: boolean;
  reason: string;
  onEdit: () => void;
  onAppeal: () => void;
}

export const ListingBlockedModal: React.FC<ListingBlockedModalProps> = ({
  visible,
  reason,
  onEdit,
  onAppeal,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onEdit}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="shield-outline" size={40} color={colors.warning} />
              <Text style={styles.title}>Listing Not Published</Text>
              <Text style={styles.message}>
                Your listing was not published because it didn't pass our
                category check. You can edit and resubmit, or appeal this
                decision.
              </Text>
            </View>

            {/* Reason */}
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.editButton]}
                onPress={onEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.editButtonText}>Edit & Resubmit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.appealButton]}
                onPress={onAppeal}
                activeOpacity={0.7}
              >
                <Ionicons name="megaphone-outline" size={18} color={colors.backgroundLight} />
                <Text style={styles.appealButtonText}>Appeal this Decision</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
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
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  reasonBox: {
    width: '100%',
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  reasonLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  reasonText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  editButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  appealButton: {
    backgroundColor: colors.tertiary,
  },
  appealButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.backgroundLight,
  },
});