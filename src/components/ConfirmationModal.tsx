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
import { typography, spacing, borderRadius } from '../theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

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

const getDynamicStyles = (themeColors: ThemeColors) => ({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: themeColors.backgroundLight,
  },
  iconColor: themeColors.primary,
  iconDestructiveColor: themeColors.error,
  title: {
    color: themeColors.textPrimary,
  },
  message: {
    color: themeColors.textSecondary,
  },
  cancelButton: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
  },
  cancelButtonText: {
    color: themeColors.textSecondary,
  },
  confirmButton: {
    backgroundColor: themeColors.primary,
  },
  confirmButtonText: {
    color: themeColors.backgroundLight,
  },
  destructiveButton: {
    backgroundColor: themeColors.error,
  },
  destructiveButtonText: {
    color: themeColors.backgroundLight,
  },
});

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
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, dynamicStyles.overlay]}>
        <View style={styles.modalContainer}>
          <View style={[styles.modal, dynamicStyles.modal]}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons
                name={confirmStyle === 'destructive' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={32}
                color={confirmStyle === 'destructive' ? dynamicStyles.iconDestructiveColor : dynamicStyles.iconColor}
              />
              <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>
              <Text style={[styles.message, dynamicStyles.message]}>{message}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {/* Only render cancel button if cancelText is provided */}
              {cancelText ? (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, dynamicStyles.cancelButton]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, dynamicStyles.cancelButtonText]}>{cancelText}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  confirmStyle === 'destructive' 
                    ? [styles.destructiveButton, dynamicStyles.destructiveButton]
                    : [styles.confirmButton, dynamicStyles.confirmButton],
                ]}
                onPress={onConfirm}
                activeOpacity={0.7}
              >
                <Text
                  style={
                    confirmStyle === 'destructive'
                      ? [styles.destructiveButtonText, dynamicStyles.destructiveButtonText]
                      : [styles.confirmButtonText, dynamicStyles.confirmButtonText]
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
    marginBottom: spacing.xl,
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
    borderWidth: 1,
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  confirmButton: {},
  confirmButtonText: {
    ...typography.body,
    fontWeight: '700',
  },
  destructiveButton: {},
  destructiveButtonText: {
    ...typography.body,
    fontWeight: '700',
  },
});
