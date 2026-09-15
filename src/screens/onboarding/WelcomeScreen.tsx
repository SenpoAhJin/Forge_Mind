/**
 * ForgeMind Onboarding - Welcome Screen
 * App logo, tagline, "Get Started" CTA
 * No fields, no backend call
 * Transitions to Role Selection
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Button } from '../../components';
import { colors, typography, spacing } from '../../theme';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo placeholder - replace with actual logo in assets */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>ForgeMind</Text>
        </View>
        
        <Text style={styles.tagline}>
          AI-Assisted Cosplay{'\n'}Project Planning
        </Text>
        
        <Text style={styles.subtitle}>
          Build your dream cosplay with smart matching,{'\n'}
          project tracking, and community marketplace
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          title="Get Started"
          onPress={onGetStarted}
          variant="primary"
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    ...typography.h1,
    color: colors.backgroundLight,
    fontSize: 24,
  },
  tagline: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
