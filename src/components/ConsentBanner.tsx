/**
 * Consent Banner Component
 * Cookie/data collection consent for compliance
 * Shows on first app launch, stores consent in AsyncStorage
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';

const CONSENT_KEY = '@forgemind:data_consent';

interface ConsentBannerProps {
  onConsentGiven?: () => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentGiven }) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem(CONSENT_KEY);
      if (!consent) {
        setVisible(true);
      }
    } catch (error) {
      console.error('[ConsentBanner] Failed to check consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({
        accepted: true,
        timestamp: new Date().toISOString(),
      }));
      setVisible(false);
      onConsentGiven?.();
    } catch (error) {
      console.error('[ConsentBanner] Failed to save consent:', error);
    }
  };

  const handleLearnMore = () => {
    // In a real app, this would navigate to privacy policy
    Linking.openURL('https://forgemind.app/privacy');
  };

  if (loading || !visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {}} // Prevent dismissal without consent
    >
      <View style={styles.overlay}>
        <View style={styles.banner}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          
          <Text style={styles.title}>Your Privacy Matters</Text>
          
          <Text style={styles.message}>
            ForgeMind collects and processes personal data to provide cosplay planning, marketplace, and event coordination services. We collect profile information, project data, and optional location data (only during event meetups).
          </Text>
          
          <Text style={styles.notice}>
            Your data is never sold. You can request data deletion at any time.
          </Text>

          <TouchableOpacity
            style={styles.learnMoreButton}
            onPress={handleLearnMore}
            activeOpacity={0.7}
          >
            <Text style={styles.learnMoreText}>Read Full Privacy Policy</Text>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptButtonText}>Accept & Continue</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  banner: {
    backgroundColor: colors.backgroundLight,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  notice: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  learnMoreText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  acceptButtonText: {
    ...typography.body,
    color: colors.backgroundLight,
    fontWeight: '700',
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 18,
  },
});
