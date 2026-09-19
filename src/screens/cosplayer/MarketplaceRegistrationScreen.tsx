/**
 * Marketplace Registration Screen
 * Cosplayer submits seller info to request marketplace access
 * Feeds existing verification pipeline (verification_status → 'pending')
 * 
 * FIELD NOTES (ALL ASSUMPTIONS - not in Foundation spec v0.2.1):
 * - seller_display_name, contact_email, contact_phone: seller identity
 * - payout_method_label, payout_method_number: MOCK FIELDS (not encrypted, demo only)
 * - agreed_to_marketplace_terms: marketplace-specific T&C (separate from account T&C)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInputField, MarketplaceRegistrationSuccessModal } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { AuthService } from '../../services/AuthService';
import {
  validateEmail,
  validateRequired,
} from '../../utils/validation';

interface MarketplaceRegistrationScreenProps {
  onSuccess: () => void;
}

export const MarketplaceRegistrationScreen: React.FC<MarketplaceRegistrationScreenProps> = ({
  onSuccess,
}) => {
  const { user } = useUser();

  // STEP 2: Marketplace role selection
  const [marketplaceRole, setMarketplaceRole] = useState<'buyer' | 'seller' | 'both' | null>(null);

  // Form fields (pre-filled with account defaults)
  const [sellerDisplayName, setSellerDisplayName] = useState(user?.display_name || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [payoutMethodLabel, setPayoutMethodLabel] = useState('');
  const [payoutMethodNumber, setPayoutMethodNumber] = useState('');
  const [agreedToMarketplaceTerms, setAgreedToMarketplaceTerms] = useState(false);

  // Validation errors
  const [sellerDisplayNameError, setSellerDisplayNameError] = useState('');
  const [contactEmailError, setContactEmailError] = useState('');
  const [payoutMethodLabelError, setPayoutMethodLabelError] = useState('');
  const [payoutMethodNumberError, setPayoutMethodNumberError] = useState('');
  const [globalError, setGlobalError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // STEP 2: Determine if payout fields are required
  const requiresPayoutInfo = marketplaceRole === 'seller' || marketplaceRole === 'both';

  // Validation functions
  const validateSellerDisplayName = (value: string): boolean => {
    const result = validateRequired(value, 'Seller display name');
    setSellerDisplayNameError(result.error);
    return result.valid;
  };

  const validateContactEmail = (value: string): boolean => {
    const result = validateEmail(value);
    setContactEmailError(result.error);
    return result.valid;
  };

  const validatePayoutMethodLabel = (value: string): boolean => {
    // STEP 2: Only validate if payout info is required
    if (!requiresPayoutInfo) {
      setPayoutMethodLabelError('');
      return true;
    }
    const result = validateRequired(value, 'Payout method');
    setPayoutMethodLabelError(result.error);
    return result.valid;
  };

  const validatePayoutMethodNumber = (value: string): boolean => {
    // STEP 2: Only validate if payout info is required
    if (!requiresPayoutInfo) {
      setPayoutMethodNumberError('');
      return true;
    }
    const result = validateRequired(value, 'Account/phone number');
    setPayoutMethodNumberError(result.error);
    return result.valid;
  };

  const handleSubmit = async () => {
    if (!user) {
      setGlobalError('No user session found. Please log in again.');
      return;
    }

    setGlobalError('');

    // STEP 2: Validate marketplace role selection
    if (!marketplaceRole) {
      setGlobalError('Please select your marketplace role');
      return;
    }

    // Validate all fields
    const isSellerNameValid = validateSellerDisplayName(sellerDisplayName);
    const isEmailValid = validateContactEmail(contactEmail);
    const isPayoutLabelValid = validatePayoutMethodLabel(payoutMethodLabel);
    const isPayoutNumberValid = validatePayoutMethodNumber(payoutMethodNumber);

    if (!isSellerNameValid || !isEmailValid || !isPayoutLabelValid || !isPayoutNumberValid) {
      return;
    }

    // Check marketplace T&C agreement
    if (!agreedToMarketplaceTerms) {
      setGlobalError('You must agree to the Marketplace Terms to submit');
      return;
    }

    setIsLoading(true);

    try {
      const result = await AuthService.submitMarketplaceRegistration(user.email, {
        marketplace_role: marketplaceRole,  // STEP 2: include role in submission
        seller_display_name: sellerDisplayName.trim(),
        contact_email: contactEmail.trim().toLowerCase(),
        contact_phone: contactPhone.trim() || undefined,
        payout_method_label: payoutMethodLabel.trim(),
        payout_method_number: payoutMethodNumber.trim(),
        agreed_to_marketplace_terms: agreedToMarketplaceTerms,
      });

      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setGlobalError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setGlobalError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    onSuccess();
  };

  const handleEditSubmission = () => {
    // Just close modal - form is already pre-filled with current values
    setShowSuccessModal(false);
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="cart" size={32} color={colors.backgroundLight} />
          </View>
          <Text style={styles.title}>Marketplace Registration</Text>
          <Text style={styles.subtitle}>
            Choose your role and complete your marketplace profile
          </Text>
        </View>

        {/* STEP 2: Marketplace Role Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I want to use the Marketplace as a:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, marketplaceRole === 'buyer' && styles.roleButtonSelected]}
              onPress={() => setMarketplaceRole('buyer')}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Ionicons
                name="cart-outline"
                size={24}
                color={marketplaceRole === 'buyer' ? colors.primary : colors.textSecondary}
              />
              <Text style={[
                styles.roleButtonText,
                marketplaceRole === 'buyer' && styles.roleButtonTextSelected
              ]}>
                Buyer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, marketplaceRole === 'seller' && styles.roleButtonSelected]}
              onPress={() => setMarketplaceRole('seller')}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Ionicons
                name="storefront-outline"
                size={24}
                color={marketplaceRole === 'seller' ? colors.primary : colors.textSecondary}
              />
              <Text style={[
                styles.roleButtonText,
                marketplaceRole === 'seller' && styles.roleButtonTextSelected
              ]}>
                Seller
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, marketplaceRole === 'both' && styles.roleButtonSelected]}
              onPress={() => setMarketplaceRole('both')}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={24}
                color={marketplaceRole === 'both' ? colors.primary : colors.textSecondary}
              />
              <Text style={[
                styles.roleButtonText,
                marketplaceRole === 'both' && styles.roleButtonTextSelected
              ]}>
                Both
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.roleNote}>
            {marketplaceRole === 'buyer' && 'Browse and purchase items from verified sellers'}
            {marketplaceRole === 'seller' && 'List items, accept commissions, and manage sales'}
            {marketplaceRole === 'both' && 'Full access to buy and sell in the marketplace'}
            {!marketplaceRole && 'Select your primary marketplace activity'}
          </Text>
        </View>

        {/* Seller Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Name</Text>
          <Text style={styles.sectionSubtitle}>
            How you'll appear in the marketplace
          </Text>

          <TextInputField
            label="Seller Display Name"
            value={sellerDisplayName}
            onChangeText={(text) => {
              setSellerDisplayName(text);
              if (sellerDisplayNameError) validateSellerDisplayName(text);
            }}
            placeholder="Your marketplace name"
            error={sellerDisplayNameError}
          />

          <Text style={styles.fieldNote}>
            This can be different from your account name
          </Text>
        </View>

        {/* Contact Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.sectionSubtitle}>
            How participants can reach you
          </Text>

          <TextInputField
            label="Contact Email"
            value={contactEmail}
            onChangeText={(text) => {
              setContactEmail(text);
              if (contactEmailError) validateContactEmail(text);
            }}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={contactEmailError}
          />

          <TextInputField
            label="Contact Phone (Optional)"
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="+63 912 345 6789"
            keyboardType="phone-pad"
          />
        </View>

        {/* STEP 2: Payout Info Section - Only shown for seller or both */}
        {requiresPayoutInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payout Information</Text>
            <Text style={styles.sectionSubtitle}>
              Where you'll receive payments for sales
            </Text>

            <View style={styles.mockBanner}>
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text style={styles.mockBannerText}>
                DEMO ONLY — These fields are not encrypted or secured. Real payment integration in backend phase.
              </Text>
            </View>

            <TextInputField
              label="Payout Method"
              value={payoutMethodLabel}
              onChangeText={(text) => {
                setPayoutMethodLabel(text);
                if (payoutMethodLabelError) validatePayoutMethodLabel(text);
              }}
              placeholder="e.g., GCash, Bank Transfer, PayMaya"
              error={payoutMethodLabelError}
            />

            <TextInputField
              label="Account/Phone Number"
              value={payoutMethodNumber}
              onChangeText={(text) => {
                setPayoutMethodNumber(text);
                if (payoutMethodNumberError) validatePayoutMethodNumber(text);
              }}
              placeholder="Account number or mobile number"
              error={payoutMethodNumberError}
            />

            <Text style={styles.fieldNote}>
              Examples: GCash number (09XX XXX XXXX), bank account number, PayMaya number
            </Text>
          </View>
        )}

        {/* Marketplace Terms */}
        <TouchableOpacity
          style={styles.termsContainer}
          onPress={() => setAgreedToMarketplaceTerms(!agreedToMarketplaceTerms)}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <View style={[styles.termsCheckbox, agreedToMarketplaceTerms && styles.termsCheckboxChecked]}>
            {agreedToMarketplaceTerms && <Ionicons name="checkmark" size={16} color={colors.backgroundLight} />}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink}>Marketplace Terms & Conditions</Text>
            {' '}(seller rules, fees, dispute resolution)
          </Text>
        </TouchableOpacity>

        <Text style={styles.termsNote}>
          Separate from account-level terms. Covers selling rules, commission guidelines, and dispute basics.
        </Text>

        {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.submitButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Submitting...' : 'Submit for Review'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <MarketplaceRegistrationSuccessModal
        visible={showSuccessModal}
        marketplaceRole={marketplaceRole!}
        sellerDisplayName={sellerDisplayName}
        contactEmail={contactEmail}
        contactPhone={contactPhone || undefined}
        payoutMethodLabel={payoutMethodLabel || undefined}
        onBackToMarketplace={handleSuccessModalContinue}
        onEditSubmission={handleEditSubmission}
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.tertiary,
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
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  // STEP 2: Role selection styles
  roleContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  roleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  roleButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  roleButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  roleButtonTextSelected: {
    color: colors.primary,
  },
  roleNote: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  fieldNote: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}20`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  mockBannerText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.warning,
    flex: 1,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  termsCheckbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  termsCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  termsNote: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
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
    backgroundColor: colors.tertiary,
  },
  submitButtonText: {
    ...typography.buttonText,
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
});

