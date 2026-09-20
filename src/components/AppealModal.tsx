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
import { colors, typography, spacing, borderRadius } from '../theme';

interface AppealModalProps {
  visible: boolean;
  listingTitle: string;
  onCancel: () => void;
  onSubmit: (message: string) => void;
}

export const AppealModal: React.FC<AppealModalProps> = ({
  visible,
  listingTitle,
  onCancel,
  onSubmit,
}) => {
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
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="shield-outline" size={32} color={colors.warning} />
              <Text style={styles.title}>Appeal This Decision</Text>
              <Text style={styles.subtitle}>
                Tell us why you believe "{listingTitle}" should be published.
              </Text>
            </View>

            {/* Appeal input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Appeal Message *</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={message}
                onChangeText={(text) => {
                  setMessage(text);
                  if (error) setError('');
                }}
                placeholder="e.g., This is a cosplay prop, not a real item..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Text style={styles.hint}>
                Your appeal will be submitted for review by a Holder.
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Submit Appeal</Text>
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.tertiary,
  },
  submitButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.backgroundLight,
  },
});