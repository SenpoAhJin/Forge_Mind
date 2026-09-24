/**
 * RejectionReasonModal
 * Modal for entering a required rejection reason when rejecting an application
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius } from '../theme';
import { toProperCase } from '../utils/textFormatting';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

interface RejectionReasonModalProps {
  visible: boolean;
  applicantName: string;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

const getDynamicStyles = (themeColors: ThemeColors) => ({
  modal: {
    backgroundColor: themeColors.backgroundLight,
  },
  title: {
    color: themeColors.error,
  },
  subtitle: {
    color: themeColors.textSecondary,
  },
  label: {
    color: themeColors.textPrimary,
  },
  input: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
    color: themeColors.textPrimary,
  },
  inputError: {
    borderColor: themeColors.error,
  },
  errorText: {
    color: themeColors.error,
  },
  hint: {
    color: themeColors.textSecondary,
  },
  cancelButton: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
  },
  cancelButtonText: {
    color: themeColors.textSecondary,
  },
  submitButton: {
    backgroundColor: themeColors.error,
  },
  submitButtonText: {
    color: themeColors.backgroundLight,
  },
});

export const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({
  visible,
  applicantName,
  onCancel,
  onSubmit,
}) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Please provide a reason for rejection');
      return;
    }
    onSubmit(trimmedReason);
    setReason('');
    setError('');
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modal, dynamicStyles.modal]}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="close-circle-outline" size={32} color={themeColors.error} />
              <Text style={[styles.title, dynamicStyles.title]}>Reject Application</Text>
              <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                Provide a reason for rejecting {applicantName}'s application
              </Text>
            </View>

            {/* Reason input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Rejection Reason *</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input, error ? dynamicStyles.inputError : null]}
                value={reason}
                onChangeText={(text) => {
                  setReason(toProperCase(text));
                  if (error) setError('');
                }}
                placeholder="e.g., Incomplete information, policy violation, etc."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              {error ? <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text> : null}
              <Text style={[styles.hint, dynamicStyles.hint]}>
                This reason will be shown to {applicantName}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, dynamicStyles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, dynamicStyles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton, dynamicStyles.submitButton]}
                onPress={handleSubmit}
                activeOpacity={0.7}
              >
                <Text style={[styles.submitButtonText, dynamicStyles.submitButtonText]}>Reject Application</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
  },
  inputError: {},
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    fontStyle: 'italic',
    marginTop: spacing.xs,
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
  submitButton: {},
  submitButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
});
