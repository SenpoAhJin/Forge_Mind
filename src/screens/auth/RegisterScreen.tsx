/**
 * ForgeMind Register Screen
 * FE-4.5: Persisted Register/Login (Mock Auth)
 * FE-5.5: Simplified to Cosplayer-only registration
 * 
 * All new accounts start as Cosplayer (is_cosplayer=true, is_organizer=false)
 * Organizer access must be requested separately after registration
 * Auto-login on success, continue to body slider if needed
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, TextInputField, RegistrationSuccessModal } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';

interface RegisterScreenProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  // Account fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Body representation - defaults (not used for organizers, but required by register function)
  const [baseBody] = useState<'male' | 'female'>('male');
  const [bodySize] = useState(0.5);

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [registerError, setRegisterError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { register } = useUser();

  // Validation functions
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

  const handleRegister = async () => {
    setRegisterError('');

    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isDisplayNameValid = validateDisplayName(displayName);

    if (
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid ||
      !isDisplayNameValid
    ) {
      return;
    }

    setIsLoading(true);

    try {
      // FE-5.5: All new accounts are cosplayer-only (is_cosplayer=true, is_organizer=false)
      const result = await register(
        email,
        password,
        displayName,
        true,  // is_cosplayer (always true)
        false, // is_organizer (always false - must request separately)
        baseBody,
        bodySize
      );

      if (result.success) {
        // Show success modal, then redirect to login (no auto-login)
        setShowSuccessModal(true);
      } else {
        setRegisterError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setRegisterError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
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
          Join ForgeMind to build projects, track items, and connect with the community
        </Text>

        {/* Role Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I'm a...</Text>
          <Text style={styles.sectionSubtitle}>
            Welcome to ForgeMind! All new accounts start as Cosplayers. You can request Event Organizer access later from your Profile.
          </Text>

          {/* Cosplayer Role - Auto-selected, non-interactive */}
          <View style={[styles.roleCard, styles.roleCardSelected]}>
            <View style={styles.roleHeader}>
              <Text style={[styles.roleTitle, styles.roleTextSelected]}>
                Cosplayer
              </Text>
              <View style={[styles.checkbox, styles.checkboxSelected]}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </View>
            <Text style={[styles.roleDescription, styles.roleDescriptionSelected]}>
              Build projects, track items, shop marketplace
            </Text>
          </View>

          <Text style={styles.note}>
            Want to organize events? You can request Event Organizer access from your Profile after creating your account.
          </Text>
        </View>

        {/* Account Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>

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
            autoCapitalize="none"
            error={emailError}
          />

          <View style={styles.passwordContainer}>
            <TextInputField
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) validatePassword(text);
                if (confirmPassword) validateConfirmPassword(confirmPassword);
              }}
              placeholder="Minimum 8 characters"
              secureTextEntry={!showPassword}
              error={passwordError}
            /><TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            ><Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.textSecondary}
              /></TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInputField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmPasswordError) validateConfirmPassword(text);
              }}
              placeholder="Re-enter your password"
              secureTextEntry={!showConfirmPassword}
              error={confirmPasswordError}
            /><TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            ><Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.textSecondary}
              /></TouchableOpacity>
          </View>

          <Text style={styles.note}>
            Note: Body representation can be customized after registration
          </Text>
        </View>

        {registerError ? <Text style={styles.globalError}>{registerError}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLoading ? 'Creating Account...' : 'Create Account'}
          onPress={handleRegister}
          variant="primary"
          fullWidth
          disabled={isLoading}
        />
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loader}
          />
        )}
        <TouchableOpacity onPress={onSwitchToLogin} disabled={isLoading}>
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <RegistrationSuccessModal
        visible={showSuccessModal}
        displayName={displayName}
        email={email}
        onContinue={onSwitchToLogin}
      />
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
    paddingTop: spacing.xxl,
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  roleCard: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  roleTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  roleTextSelected: {
    color: colors.primary,
  },
  roleDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  roleDescriptionSelected: {
    color: colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.backgroundLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
  globalError: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  loader: {
    position: 'absolute',
    top: spacing.md + 10,
    alignSelf: 'center',
  },
  switchText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  switchLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 38, // Position below label, aligned with input
  },
});
