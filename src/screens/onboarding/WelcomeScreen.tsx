/**
 * ForgeMind Onboarding - Welcome Screen
 * App logo, tagline, "Get Started" CTA
 * No fields, no backend call
 * Transitions to Role Selection
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoShadow}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/in-app_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="ForgeMind logo"
            />
          </View>
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
  logoShadow: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundLight,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
