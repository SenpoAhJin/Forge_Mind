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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius } from '../theme';
import { toProperCase, isAllLowercase } from '../utils/textFormatting';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Please provide a reason for rejection');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(trimmedReason);
      setReason('');
      setError('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onCancel();
  };

  const isReasonEmpty = !reason.trim();

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
            </View>

            <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
              Provide a reason for rejecting {applicantName}'s application
            </Text>

            {/* Reason input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Rejection Reason *</Text>
              <TextInput
                style={[
                  styles.input,
                  dynamicStyles.input,
                  error ? dynamicStyles.inputError : null,
                  reason.trim() ? styles.inputFocused : null,
                ]}
                value={reason}
                onChangeText={(text) => {
                  const formatted = isAllLowercase(text) ? toProperCase(text) : text;
                  setReason(formatted);
                  if (error) setError('');
                }}
                placeholder="e.g., Incomplete information, policy violation, etc."
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                editable={!isSubmitting}
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
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                <Text
                  style={[styles.buttonText, dynamicStyles.cancelButtonText]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  dynamicStyles.submitButton,
                  (isReasonEmpty || isSubmitting) && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={isReasonEmpty || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={themeColors.backgroundLight} />
                ) : (
                  <Text
                    style={[styles.buttonText, dynamicStyles.submitButtonText]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    Reject
                  </Text>
                )}
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
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    ...typography.h2,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderWidth: 1,
  },
  inputError: {},
  errorText: {
    ...typography.caption,
    marginTop: 8,
  },
  hint: {
    ...typography.caption,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  button: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {},
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
