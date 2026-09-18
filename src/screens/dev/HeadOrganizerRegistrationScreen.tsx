/**
 * DEV-ONLY: Head Organizer Registration Shortcut
 * Bypasses real Holder approval system for fast testing
 * Wrapped in __DEV__ check - does not exist in production builds
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { AuthService } from '../../services/AuthService';
import { Ionicons } from '@expo/vector-icons';

interface HeadOrganizerRegistrationScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const HeadOrganizerRegistrationScreen: React.FC<HeadOrganizerRegistrationScreenProps> = ({
  onSuccess,
  onBack,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!displayName.trim() || !email.trim() || !password.trim() || !organization.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Register with organizer_role='head' directly (dev shortcut)
      const result = await AuthService.register(
        email.trim().toLowerCase(),
        password,            // ← FIX: password in correct position
        displayName.trim(),  // ← FIX: displayName in correct position
        false, // is_cosplayer
        true,  // is_organizer
        'male', // baseBody (placeholder - not used for organizers)
        0.5     // bodySize (placeholder - not used for organizers)
      );

      if (result.success) {
        // Set organizer_role to 'head' directly (bypassing OrganizerAccessRequest)
        await AuthService.updateOrganizerRole(email.trim().toLowerCase(), 'head');

        // Log in immediately
        const loginResult = await AuthService.login(email.trim().toLowerCase(), password);

        if (loginResult.success) {
          Alert.alert(
            'Success',
            `Head Organizer account created for ${organization}`,
            [{ text: 'OK', onPress: onSuccess }]
          );
        } else {
          Alert.alert('Error', 'Account created but login failed');
        }
      } else {
        Alert.alert('Error', result.error || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="words"
            editable={!loading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.textDisabled}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            placeholderTextColor={colors.textDisabled}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Organization / Event Group Name</Text>
          <TextInput
            style={styles.input}
            value={organization}
            onChangeText={setOrganization}
            placeholder="e.g., Manila Cosplay Con"
            placeholderTextColor={colors.textDisabled}
            editable={!loading}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Head Organizer Account</Text>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: spacing.xl,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}20`,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  devBannerText: {
    fontSize: 13,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#4B0082',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#4B0082',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  backButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
