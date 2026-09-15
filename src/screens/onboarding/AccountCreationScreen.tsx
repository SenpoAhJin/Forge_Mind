/**
 * ForgeMind Onboarding - Account Creation Screen
 * Email, password, display name
 * Maps to User.email, User.password_hash (plain for now), User.display_name
 * Basic client-side validation (email format, password length)
 * Transitions to Body Slider Onboarding
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, TextInputField } from '../../components';
import { colors, typography, spacing } from '../../theme';

interface AccountCreationScreenProps {
  onContinue: (email: string, password: string, displayName: string) => void;
  onBack: () => void;
}

export const AccountCreationScreen: React.FC<AccountCreationScreenProps> = ({
  onContinue,
  onBack,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');

  // Email validation (basic format check)
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Password validation (minimum 8 characters)
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Confirm password validation
  const validateConfirmPassword = (confirmPassword: string): boolean => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  // Display name validation (1-100 characters per schema)
  const validateDisplayName = (displayName: string): boolean => {
    if (!displayName) {
      setDisplayNameError('Display name is required');
      return false;
    }
    if (displayName.length > 100) {
      setDisplayNameError('Display name must be 100 characters or less');
      return false;
    }
    setDisplayNameError('');
    return true;
  };

  const handleContinue = () => {
    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isDisplayNameValid = validateDisplayName(displayName);

    if (isEmailValid && isPasswordValid && isConfirmPasswordValid && isDisplayNameValid) {
      onContinue(email, password, displayName);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Set up your ForgeMind account to get started
        </Text>

        <View style={styles.form}>
          <TextInputField
            label="Display Name"
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              if (displayNameError) validateDisplayName(text);
            }}
            placeholder="How should we call you?"
            error={displayNameError}
          />

          <TextInputField
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) validateEmail(text);
            }}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            error={emailError}
          />

          <TextInputField
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) validatePassword(text);
              // Re-validate confirm password if it's already filled
              if (confirmPassword) validateConfirmPassword(confirmPassword);
            }}
            placeholder="Minimum 8 characters"
            secureTextEntry
            error={passwordError}
          />

          <TextInputField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (confirmPasswordError) validateConfirmPassword(text);
            }}
            placeholder="Re-enter your password"
            secureTextEntry
            error={confirmPasswordError}
          />

          <Text style={styles.note}>
            Note: Password will be securely hashed on the server (BE-1 implementation)
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          fullWidth
        />
        <Button title="Back" onPress={onBack} variant="tertiary" fullWidth />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  form: {
    gap: spacing.sm,
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
