/**
 * ForgeMind Login Screen
 * FE-4.5: Persisted Register/Login (Mock Auth)
 * 
 * Email + password checked against stored accounts
 * On success: restore full state, route to correct tab set, skip onboarding
 * On failure: plain inline error
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Button, TextInputField } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';

interface LoginScreenProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useUser();

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError('Email is required');
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
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    setLoginError('');

    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        // Success - restore full state, route to correct tab set
        onSuccess();
      } else {
        setLoginError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      setLoginError('An unexpected error occurred. Please try again.');
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
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Log in to continue building your cosplay projects
          </Text>
        </View>

        <View style={styles.form}>
          <TextInputField
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) validateEmail(text);
              if (loginError) setLoginError('');
            }}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
          />

          <TextInputField
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) validatePassword(text);
              if (loginError) setLoginError('');
            }}
            placeholder="Enter your password"
            secureTextEntry
            error={passwordError}
          />

          {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Button
            title={isLoading ? 'Logging In...' : 'Log In'}
            onPress={handleLogin}
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
        </View>

        <TouchableOpacity
          onPress={onSwitchToRegister}
          disabled={isLoading}
          style={styles.switchContainer}
        >
          <Text style={styles.switchText}>
            Don't have an account? <Text style={styles.switchLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl * 2,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xl * 2,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  form: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
  },
  actions: {
    marginBottom: spacing.lg,
  },
  loader: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
  },
  switchContainer: {
    alignItems: 'center',
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
});
