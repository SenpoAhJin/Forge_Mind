/**
 * DEV-ONLY: Staff Registration Shortcut
 * Bypasses real EventStaffMember invite flow for fast testing
 * Wrapped in __DEV__ check - does not exist in production builds
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { AuthService } from '../../services/AuthService';
import { OrganizerService } from '../../services/OrganizerService';
import { Ionicons } from '@expo/vector-icons';
import { TextInputField, RegistrationSuccessModal } from '../../components';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateDisplayName,
} from '../../utils/validation';

interface StaffRegistrationScreenProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onBack: () => void;
}

const DEPARTMENTS = [
  { value: 'logistics', label: 'Logistics' },
  { value: 'programs', label: 'Programs' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'secretariat', label: 'Secretariat' },
  { value: 'technical_production', label: 'Technical Production' },
  { value: 'marketing', label: 'Marketing' },
];

export const StaffRegistrationScreen: React.FC<StaffRegistrationScreenProps> = ({
  onSuccess,
  onSwitchToLogin,
  onBack,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('logistics');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Show/hide password toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation errors
  const [displayNameError, setDisplayNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [globalError, setGlobalError] = useState('');

  const handleValidateDisplayName = (value: string) => {
    const result = validateDisplayName(value);
    setDisplayNameError(result.error);
    return result.valid;
  };

  const handleValidateEmail = (value: string) => {
    const result = validateEmail(value);
    setEmailError(result.error);
    return result.valid;
  };

  const handleValidatePassword = (value: string) => {
    const result = validatePassword(value);
    setPasswordError(result.error);
    return result.valid;
  };

  const handleValidateConfirmPassword = (value: string) => {
    const result = validateConfirmPassword(password, value);
    setConfirmPasswordError(result.error);
    return result.valid;
  };

  const handleSubmit = async () => {
    setGlobalError('');

    // Validate all fields
    const isDisplayNameValid = handleValidateDisplayName(displayName);
    const isEmailValid = handleValidateEmail(email);
    const isPasswordValid = handleValidatePassword(password);
    const isConfirmPasswordValid = handleValidateConfirmPassword(confirmPassword);

    if (
      !isDisplayNameValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid
    ) {
      return;
    }

    setLoading(true);

    try {
      // Register with organizer_role='staff' directly (dev shortcut)
      const result = await AuthService.register(
        email.trim().toLowerCase(),
        password,
        displayName.trim(),
        false, // is_cosplayer
        true,  // is_organizer
        'male', // baseBody (placeholder - not used for organizers)
        0.5     // bodySize (placeholder - not used for organizers)
      );

      if (result.success) {
        // Set organizer_role to 'staff' directly (bypassing EventStaffMember invite)
        await AuthService.updateOrganizerRole(email.trim().toLowerCase(), 'staff');

        // Create dev-only EventStaffMember record
        await OrganizerService.createDevStaffMember(
          email.trim().toLowerCase(),
          'dev-mock-head@test.com', // Mock head_user_id
          'dev-test-event',
          department as any
        );

        // Log in immediately
        const loginResult = await AuthService.login(email.trim().toLowerCase(), password);

        if (loginResult.success) {
          setShowSuccessModal(true);
        } else {
          setGlobalError('Account created but login failed');
        }
      } else {
        setGlobalError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setGlobalError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    onSwitchToLogin();
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
        {/* Dev-only banner */}
        <View style={styles.devBanner}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={styles.devBannerText}>
            DEV SHORTCUT — bypasses real Holder approval
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Staff Registration</Text>
          <Text style={styles.subtitle}>
            Join an event's organizing team.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.section}>
          <TextInputField
            label="Display Name"
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              if (displayNameError) handleValidateDisplayName(text);
            }}
            placeholder="Your name"
            error={displayNameError}

          />

          <TextInputField
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) handleValidateEmail(text);
            }}
            placeholder="your@email.com"
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
                if (passwordError) handleValidatePassword(text);
                if (confirmPassword) handleValidateConfirmPassword(confirmPassword);
              }}
              placeholder="Minimum 8 characters"
              secureTextEntry={!showPassword}
              error={passwordError}

            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={loading}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInputField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmPasswordError) handleValidateConfirmPassword(text);
              }}
              placeholder="Re-enter your password"
              secureTextEntry={!showConfirmPassword}
              error={confirmPasswordError}

            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={loading}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.departmentGrid}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept.value}
                  style={[
                    styles.departmentChip,
                    department === dept.value && styles.departmentChipActive,
                  ]}
                  onPress={() => setDepartment(dept.value)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.departmentChipText,
                      department === dept.value && styles.departmentChipTextActive,
                    ]}
                  >
                    {dept.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating Account...' : 'Create Staff Account'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={onBack}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <RegistrationSuccessModal
        visible={showSuccessModal}
        displayName={displayName}
        email={email}
        onContinue={handleSuccessModalContinue}
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
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}20`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  devBannerText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.warning,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: '#4ECDC4',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 38,
  },
  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  departmentChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  departmentChipActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  departmentChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  departmentChipTextActive: {
    color: '#fff',
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
  button: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#4ECDC4',
  },
  submitButtonText: {
    ...typography.buttonText,
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  backButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    ...typography.buttonText,
    color: colors.textSecondary,
  },
});
