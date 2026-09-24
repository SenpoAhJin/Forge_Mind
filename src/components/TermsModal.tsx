/**
 * TermsModal
 * Displays Terms & Conditions or Marketplace Terms
 * PLACEHOLDER content — to be replaced with real legal text
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius } from '../theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  type?: 'account' | 'marketplace';
}

const getDynamicStyles = (themeColors: ThemeColors) => ({
  container: { backgroundColor: themeColors.backgroundLight },
  header: { borderBottomColor: themeColors.border },
  title: { color: themeColors.textPrimary },
  placeholderBanner: { backgroundColor: themeColors.warning + '15', borderLeftColor: themeColors.warning },
  placeholderText: { color: themeColors.textPrimary },
  sectionTitle: { color: themeColors.textPrimary },
  bodyText: { color: themeColors.textSecondary },
  lastUpdated: { color: themeColors.textDisabled },
  footer: { borderTopColor: themeColors.border },
  closeFooterButton: { backgroundColor: themeColors.primary },
  closeFooterButtonText: { color: themeColors.backgroundLight },
});

export const TermsModal: React.FC<TermsModalProps> = ({
  visible,
  onClose,
  type = 'account',
}) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  const isMarketplace = type === 'marketplace';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, dynamicStyles.container]}>
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <View style={styles.headerContent}>
            <Ionicons
              name="document-text-outline"
              size={24}
              color={themeColors.textPrimary}
            />
            <Text style={[styles.title, dynamicStyles.title]}>
              {isMarketplace ? 'Marketplace Terms & Conditions' : 'Terms & Conditions'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={[styles.placeholderBanner, dynamicStyles.placeholderBanner]}>
            <Ionicons name="alert-circle-outline" size={20} color={themeColors.warning} />
            <Text style={[styles.placeholderText, dynamicStyles.placeholderText]}>
              PLACEHOLDER CONTENT — To be replaced with real legal text
            </Text>
          </View>

          {isMarketplace ? (
            <>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>1. Marketplace Overview</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                ForgeMind Marketplace allows verified cosplayers to buy, sell, and trade cosplay
                items and request commissions from crafters. By using the Marketplace, you agree
                to these terms.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>2. Seller Requirements</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                Sellers must be verified by a Head Organizer before listing items. All listings
                must include accurate descriptions, clear photos, and fair pricing. Prohibited
                items include replicas of licensed merchandise and unsafe materials.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>3. Fees & Payments</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                ForgeMind charges a [X]% transaction fee on completed sales. Payments are
                processed through [payment provider]. Sellers are responsible for applicable
                taxes on their sales.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>4. Dispute Resolution</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                Disputes between buyers and sellers should be reported to a Head Organizer
                within [X] days of transaction completion. ForgeMind reserves the right to
                mediate disputes and revoke marketplace access for policy violations.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>5. Prohibited Conduct</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                Users may not engage in price manipulation, counterfeit sales, harassment, or
                other behavior that violates ForgeMind community standards. Violations may result
                in permanent marketplace ban.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>1. Acceptance of Terms</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                By creating a ForgeMind account, you agree to be bound by these Terms &
                Conditions. If you do not agree, do not use this service.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>2. User Accounts</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                You are responsible for maintaining the security of your account credentials.
                You must provide accurate information during registration and keep it up to date.
                Accounts are personal and may not be shared or transferred.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>3. User Conduct</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                Users must treat all community members with respect. Harassment, hate speech,
                impersonation, spam, and illegal activity are prohibited. ForgeMind reserves
                the right to suspend or terminate accounts for policy violations.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>4. Content & Intellectual Property</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                Users retain ownership of content they upload (photos, project data, etc.) but
                grant ForgeMind a license to use such content for operating the service. Users
                must not upload content that infringes on others' intellectual property rights.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>5. Privacy</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                Your use of ForgeMind is also governed by our Privacy Policy, which describes
                how we collect, use, and protect your personal information. By using ForgeMind,
                you consent to our data practices as described in the Privacy Policy.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>6. Disclaimer of Warranties</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                ForgeMind is provided "as is" without warranties of any kind. We do not guarantee
                the service will be uninterrupted, error-free, or secure. Use at your own risk.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>7. Limitation of Liability</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                ForgeMind and its operators are not liable for any indirect, incidental, or
                consequential damages arising from your use of the service, including data loss,
                project failures, or marketplace transaction disputes.
              </Text>

              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>8. Changes to Terms</Text>
              <Text style={[styles.bodyText, dynamicStyles.bodyText]}>
                We reserve the right to modify these terms at any time. Continued use of
                ForgeMind after changes constitutes acceptance of the updated terms.
              </Text>
            </>
          )}

          <Text style={[styles.lastUpdated, dynamicStyles.lastUpdated]}>
            Last updated: [Date placeholder]
          </Text>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, dynamicStyles.footer]}>
          <TouchableOpacity
            style={[styles.closeFooterButton, dynamicStyles.closeFooterButton]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeFooterButtonText, dynamicStyles.closeFooterButtonText]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    ...typography.h2,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  placeholderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderLeftWidth: 3,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  placeholderText: {
    ...typography.caption,
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  lastUpdated: {
    ...typography.caption,
    fontStyle: 'italic',
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  closeFooterButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    ...typography.body,
    fontWeight: '700',
  },
});
