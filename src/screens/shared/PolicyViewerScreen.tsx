/**
 * Policy Viewer Screen
 * Displays Privacy Policy, Terms of Service, and other legal documents
 */

import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import {
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  REFUND_POLICY,
  COOKIE_POLICY,
} from '../../constants/policies';

type PolicyType = 'privacy' | 'terms' | 'refund' | 'cookie';

interface PolicyViewerScreenProps {
  route: RouteProp<{ params: { policyType: PolicyType } }, 'params'>;
}

const getPolicyContent = (type: PolicyType): string => {
  switch (type) {
    case 'privacy':
      return PRIVACY_POLICY;
    case 'terms':
      return TERMS_OF_SERVICE;
    case 'refund':
      return REFUND_POLICY;
    case 'cookie':
      return COOKIE_POLICY;
    default:
      return '';
  }
};

export const PolicyViewerScreen: React.FC<PolicyViewerScreenProps> = ({ route }) => {
  const { policyType } = route.params;
  const content = getPolicyContent(policyType);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.text}>{content}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  text: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
});
