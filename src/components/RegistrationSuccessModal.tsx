/**
 * Registration Success Modal
 * Beautiful, animated modal shown after successful account creation
 * Displays welcome message and redirects to login screen
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

interface RegistrationSuccessModalProps {
  visible: boolean;
  displayName: string;
  email: string;
  onContinue: () => void;
  /**
   * Optional marketplace-specific overrides (STEP 3 - Marketplace success recap).
   * Defaults preserve the legacy account-creation copy so Cosplayer, Head,
   * and Staff registration callers are unaffected.
   */
  title?: string;
  subtitle?: string;
  primaryButtonLabel?: string;
  secondaryButtonLabel?: string;
  onSecondary?: () => void;
  /** Read-only recap rows shown in the details card (label → value) */
  recapFields?: { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap }[];
}

const { width } = Dimensions.get('window');

const getDynamicStyles = (themeColors: ThemeColors) => ({
  modal: { backgroundColor: themeColors.backgroundLight },
  checkmarkCircle: { backgroundColor: themeColors.success, shadowColor: themeColors.success },
  title: { color: themeColors.textPrimary },
  subtitle: { color: themeColors.textSecondary },
  detailsCard: { backgroundColor: themeColors.surface, borderColor: themeColors.border },
  detailLabel: { color: themeColors.textSecondary },
  detailValue: { color: themeColors.textPrimary },
  infoBox: { backgroundColor: themeColors.info + '10', borderLeftColor: themeColors.info },
  infoText: { color: themeColors.textPrimary },
  continueButton: { backgroundColor: themeColors.primary, shadowColor: themeColors.primary },
  continueButtonText: { color: themeColors.backgroundLight },
});

export const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  visible,
  displayName,
  email,
  onContinue,
  // Optional marketplace-specific overrides (STEP 3). Undefined → legacy defaults.
  title,
  subtitle,
  primaryButtonLabel,
  secondaryButtonLabel,
  onSecondary,
  recapFields,
}) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Sequence: fade in backdrop → scale in modal → animate checkmark
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          tension: 40,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      checkmarkAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onContinue}
    >
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.modal,
            dynamicStyles.modal,
            {
              transform: [
                {
                  scale: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
              opacity: scaleAnim,
            },
          ]}
        >
          {/* Success Checkmark with animated circle */}
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [
                  {
                    scale: checkmarkAnim,
                  },
                  {
                    rotate: checkmarkAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.checkmarkCircle, dynamicStyles.checkmarkCircle]}>
              <Ionicons name="checkmark" size={48} color={themeColors.backgroundLight} />
            </View>
          </Animated.View>

          {/* Success Message */}
          <Text style={[styles.title, dynamicStyles.title]}>{title ?? 'Welcome to ForgeMind!'}</Text>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>{subtitle ?? 'Your account has been created successfully'}</Text>

          {/* Account Details */}
          <View style={[styles.detailsCard, dynamicStyles.detailsCard]}>
            <View style={styles.detailRow}>
              <Ionicons name="person-circle-outline" size={20} color={themeColors.primary} />
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Display Name</Text>
            </View>
            <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{displayName}</Text>

            <View style={[styles.detailRow, { marginTop: spacing.md }]}>
              <Ionicons name="mail-outline" size={20} color={themeColors.primary} />
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Email</Text>
            </View>
            <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{email}</Text>

            {/* Optional recap rows (STEP 3 - e.g. marketplace submission recap). 
                Each iteration is wrapped in a Fragment so rows render as one parent unit. */}
            {recapFields?.map((field, idx) => (
              <React.Fragment key={idx}>
                <View style={[styles.detailRow, { marginTop: spacing.md }]}>
                  <Ionicons
                    name={field.icon ?? 'information-circle-outline'}
                    size={20}
                    color={themeColors.primary}
                  />
                  <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>{field.label}</Text>
                </View>
                <Text style={[styles.detailValue, dynamicStyles.detailValue]}>{field.value}</Text>
              </React.Fragment>
            ))}
          </View>

          {/* Info Note */}
          <View style={[styles.infoBox, dynamicStyles.infoBox]}>
            <Ionicons name="information-circle-outline" size={18} color={themeColors.info} />
            <Text style={[styles.infoText, dynamicStyles.infoText]}>
              Please use your email and password to log in and start building your cosplay projects!
            </Text>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, dynamicStyles.continueButton]}
            onPress={onContinue}
            activeOpacity={0.8}
          >
            <Text style={[styles.continueButtonText, dynamicStyles.continueButtonText]}>{primaryButtonLabel ?? 'Continue to Login'}</Text>
            <Ionicons name="arrow-forward" size={20} color={themeColors.backgroundLight} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    width: width - spacing.xl * 2,
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  checkmarkContainer: {
    marginBottom: spacing.lg,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    ...typography.h2,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  detailsCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  detailLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
    borderLeftWidth: 3,
  },
  infoText: {
    ...typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  continueButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    ...typography.body,
    fontWeight: '700',
  },
});
