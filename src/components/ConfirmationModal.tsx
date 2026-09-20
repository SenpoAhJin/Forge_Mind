/**
 * ConfirmationModal
 * Generic confirmation dialog for yes/no decisions
 * Replaces Alert.alert for web compatibility
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

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'default',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons
                name={confirmStyle === 'destructive' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={32}
                color={confirmStyle === 'destructive' ? colors.error : colors.primary}
              />
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {/* Only render cancel button if cancelText is provided */}
              {cancelText ? (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  confirmStyle === 'destructive' ? styles.destructiveButton : styles.confirmButton,
                ]}
                onPress={onConfirm}
                activeOpacity={0.7}
              >
                <Text
                  style={
                    confirmStyle === 'destructive'
                      ? styles.destructiveButtonText
                      : styles.confirmButtonText
                  }
                >
                  {confirmText}
                </Text>
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
    marginBottom: spacing.xl,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.backgroundLight,
  },
  destructiveButton: {
    backgroundColor: colors.error,
  },
  destructiveButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.backgroundLight,
  },
});
