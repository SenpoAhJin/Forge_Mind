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
import { typography, spacing, borderRadius } from '../theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

interface ListingBlockedModalProps {
  visible: boolean;
  reason: string;
  onEdit: () => void;
  onAppeal: () => void;
}

const getDynamicStyles = (themeColors: ThemeColors) => ({
  modal: { backgroundColor: themeColors.backgroundLight },
  title: { color: themeColors.textPrimary },
  message: { color: themeColors.textSecondary },
  reasonBox: { backgroundColor: themeColors.warning + '10', borderColor: themeColors.warning + '30' },
  reasonLabel: { color: themeColors.warning },
  reasonText: { color: themeColors.textPrimary },
  editButton: { backgroundColor: themeColors.surface, borderColor: themeColors.border },
  editButtonText: { color: themeColors.textSecondary },
  appealButton: { backgroundColor: themeColors.accent },
  appealButtonText: { color: themeColors.backgroundLight },
});

export const ListingBlockedModal: React.FC<ListingBlockedModalProps> = ({
  visible,
  reason,
  onEdit,
  onAppeal,
}) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onEdit}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.modal, dynamicStyles.modal]}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="shield-outline" size={40} color={themeColors.warning} />
              <Text style={[styles.title, dynamicStyles.title]}>Listing Not Published</Text>
              <Text style={[styles.message, dynamicStyles.message]}>
                Your listing was not published because it didn't pass our
                category check. You can edit and resubmit, or appeal this
                decision.
              </Text>
            </View>

            {/* Reason */}
            <View style={[styles.reasonBox, dynamicStyles.reasonBox]}>
              <Text style={[styles.reasonLabel, dynamicStyles.reasonLabel]}>Reason:</Text>
              <Text style={[styles.reasonText, dynamicStyles.reasonText]}>{reason}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.editButton, dynamicStyles.editButton]}
                onPress={onEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color={themeColors.textSecondary} />
                <Text style={[styles.editButtonText, dynamicStyles.editButtonText]}>Edit & Resubmit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.appealButton, dynamicStyles.appealButton]}
                onPress={onAppeal}
                activeOpacity={0.7}
              >
                <Ionicons name="megaphone-outline" size={18} color={themeColors.backgroundLight} />
                <Text style={[styles.appealButtonText, dynamicStyles.appealButtonText]}>Appeal this Decision</Text>
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
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  reasonBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  reasonLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  reasonText: {
    ...typography.body,
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
    borderWidth: 1,
  },
  editButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  appealButton: {},
  appealButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
});