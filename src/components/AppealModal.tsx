/**
 * AppealModal
 * Modal for a seller to submit an appeal against a blocked marketplace
 * listing (FE-6 Step 2). Follows the same pattern as RejectionReasonModal
 * but is relabeled for appeal text instead of rejection text.
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
import { toProperCase, isAllLowercase } from '../utils/textFormatting';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

interface AppealModalProps {
  visible: boolean;
  listingTitle: string;
  onCancel: () => void;
  onSubmit: (message: string) => void;
}

const getDynamicStyles = (themeColors: ThemeColors) => ({
  modal: { backgroundColor: themeColors.backgroundLight },
  title: { color: themeColors.textPrimary },
  subtitle: { color: themeColors.textSecondary },
  label: { color: themeColors.textPrimary },
  input: { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.textPrimary },
  inputError: { borderColor: themeColors.error },
  errorText: { color: themeColors.error },
  hint: { color: themeColors.textSecondary },
  cancelButton: { backgroundColor: themeColors.surface, borderColor: themeColors.border },
  cancelButtonText: { color: themeColors.textSecondary },
  submitButton: { backgroundColor: themeColors.accent },
  submitButtonText: { color: themeColors.backgroundLight },
});

export const AppealModal: React.FC<AppealModalProps> = ({
  visible,
  listingTitle,
  onCancel,
  onSubmit,
}) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError('Please explain why you believe this listing should be allowed');
      return;
    }
    onSubmit(trimmedMessage);
    setMessage('');
    setError('');
  };

  const handleCancel = () => {
    setMessage('');
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
              <Ionicons name="shield-outline" size={32} color={themeColors.warning} />
              <Text style={[styles.title, dynamicStyles.title]}>Appeal This Decision</Text>
              <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                Tell us why you believe "{listingTitle}" should be published.
              </Text>
            </View>

            {/* Appeal input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Appeal Message *</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input, error ? dynamicStyles.inputError : null]}
                value={message}
                onChangeText={(text) => {
                  const formatted = isAllLowercase(text) ? toProperCase(text) : text;
                  setMessage(formatted);
                  if (error) setError('');
                }}
                placeholder="e.g., This is a cosplay prop, not a real item..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              {error ? <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text> : null}
              <Text style={[styles.hint, dynamicStyles.hint]}>
                Your appeal will be submitted for review by a Holder.
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
                <Text style={[styles.submitButtonText, dynamicStyles.submitButtonText]}>Submit Appeal</Text>
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
    textAlign: 'center',
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