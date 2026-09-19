/**
 * DEV-ONLY: Head Organizer Registration Shortcut
 * Bypasses real Holder approval system for fast testing
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
import { Ionicons } from '@expo/vector-icons';
import { TextInputField, RegistrationSuccessModal } from '../../components';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateDisplayName,
  validateRequired,
} from '../../utils/validation';
import {
  STAFF_DEPARTMENTS,
  DEPARTMENT_LABELS,
  StaffDepartment,
} from '../../types/organizer';

interface HeadOrganizerRegistrationScreenProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onBack: () => void;
}

export const HeadOrganizerRegistrationScreen: React.FC<HeadOrganizerRegistrationScreenProps> = ({
  onSuccess,
  onSwitchToLogin,
  onBack,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [department, setDepartment] = useState<StaffDepartment | null>(null); // NEW: Head Organizer department
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
  const [organizationError, setOrganizationError] = useState('');
  const [departmentError, setDepartmentError] = useState(''); // NEW
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

  const handleValidateOrganization = (value: string) => {
    const result = validateRequired(value, 'Organization name');
    setOrganizationError(result.error);
    return result.valid;
  };

  const handleSubmit = async () => {
    setGlobalError('');

    // Validate all fields
    const isDisplayNameValid = handleValidateDisplayName(displayName);
    const isEmailValid = handleValidateEmail(email);
    const isPasswordValid = handleValidatePassword(password);
    const isConfirmPasswordValid = handleValidateConfirmPassword(confirmPassword);
    const isOrganizationValid = handleValidateOrganization(organization);

    // NEW: Validate department selection
    if (!department) {
      setDepartmentError('Please select a department');
      return;
    }

    if (
      !isDisplayNameValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid ||
      !isOrganizationValid
    ) {
      return;
    }

    setLoading(true);

    try {
      // Register with organizer_role='head' directly (dev shortcut)
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
        // Set organizer_role to 'head' directly (bypassing OrganizerAccessRequest)
        await AuthService.updateOrganizerRole(email.trim().toLowerCase(), 'head');

        // NEW: Set Head Organizer department
        await AuthService.setHeadOrganizerDepartment(email.trim().toLowerCase(), department);

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
            <Ionicons name="star" size={32} color="#FFD700" />
          </View>
          <Text style={styles.title}>Head Organizer Registration</Text>
          <Text style={styles.subtitle}>
            Set up as the lead organizer for your events.
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

          <TextInputField
            label="Organization / Event Group Name"
            value={organization}
            onChangeText={(text) => {
              setOrganization(text);
              if (organizationError) handleValidateOrganization(text);
            }}
            placeholder="e.g., Manila Cosplay Con"
            error={organizationError}
          />

          {/* NEW: Department selection */}
          <View style={styles.departmentSection}>
            <Text style={styles.departmentLabel}>Department to Manage *</Text>
            <Text style={styles.departmentHint}>
              Select the ONE department you will manage. Multiple Head Organizers can manage the same department.
            </Text>
            <View style={styles.departmentGrid}>
              {STAFF_DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.departmentButton,
                    department === dept && styles.departmentButtonSelected,
                  ]}
                  onPress={() => {
                    setDepartment(dept);
                    setDepartmentError('');
                  }}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.departmentButtonText,
                      department === dept && styles.departmentButtonTextSelected,
                    ]}
                  >
                    {DEPARTMENT_LABELS[dept]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {departmentError ? (
              <Text style={styles.departmentError}>{departmentError}</Text>
            ) : null}
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
              {loading ? 'Creating Account...' : 'Create Head Organizer Account'}
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
    backgroundColor: '#4B0082',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: '#4B0082',
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
  departmentSection: {
    marginTop: spacing.lg,
  },
  departmentLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  departmentHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  departmentButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  departmentButtonSelected: {
    borderColor: colors.secondary,
    backgroundColor: `${colors.secondary}10`,
  },
  departmentButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  departmentButtonTextSelected: {
    color: colors.secondary,
  },
  departmentError: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 38,
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
    backgroundColor: '#4B0082',
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
