/**
 * Create Listing Screen - Sellers Only (FE-6 Step 1)
 * Create marketplace listing with validation
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
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { TextInputField, TextAreaField, Button, AppealModal, ListingBlockedModal, ConfirmationModal } from '../../components';
import { MARKETPLACE_CATEGORIES, CONDITION_LABELS } from '../../constants/marketplaceCategories';
import { MarketplaceCondition, Listing } from '../../types/marketplace';
import { screenListing } from '../../utils/listingScreener';

interface CreateListingScreenProps {
  onSuccess: () => void;
}

export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({ onSuccess }) => {
  const navigation = useNavigation();
  const { user } = useUser();
  const { createListing, submitAppeal } = useMarketplace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<MarketplaceCondition | ''>('');

  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [conditionError, setConditionError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // FE-6 Step 2: blocked-listing + appeal flow state
  const [blockedListing, setBlockedListing] = useState<Listing | null>(null);
  const [blockedModalVisible, setBlockedModalVisible] = useState(false);
  const [appealVisible, setAppealVisible] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  const validateFields = (): boolean => {
    let isValid = true;

    // Reset errors
    setTitleError('');
    setDescriptionError('');
    setCategoryError('');
    setPriceError('');
    setConditionError('');
    setGlobalError('');

    // Title
    if (!title.trim()) {
      setTitleError('Title is required');
      isValid = false;
    } else if (title.trim().length < 5) {
      setTitleError('Title must be at least 5 characters');
      isValid = false;
    }

    // Description
    if (!description.trim()) {
      setDescriptionError('Description is required');
      isValid = false;
    } else if (description.trim().length < 20) {
      setDescriptionError('Description must be at least 20 characters');
      isValid = false;
    }

    // Category
    if (!category) {
      setCategoryError('Please select a category');
      isValid = false;
    }

    // Price
    const priceNum = parseFloat(price);
    if (!price.trim()) {
      setPriceError('Price is required');
      isValid = false;
    } else if (isNaN(priceNum) || priceNum <= 0) {
      setPriceError('Please enter a valid price greater than 0');
      isValid = false;
    }

    // Condition
    if (!condition) {
      setConditionError('Please select condition');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateFields()) {
      setGlobalError('Please fix the errors above');
      return;
    }

    if (!user?.email) {
      setGlobalError('User email not found');
      return;
    }

    const input = {
      title: title.trim(),
      description: description.trim(),
      category,
      price: parseFloat(price),
      condition: condition as MarketplaceCondition,
      photos: [], // No photo upload in Step 1
    };

    // FE-6 Step 2: every submitted listing is screened at the point of posting
    // (mock rule-based screener; real classification is Phase 4).
    const screening = screenListing(input);

    setIsLoading(true);
    try {
      if (screening.passed) {
        await createListing(user.email, input);
        // Success - navigate back (listing published normally)
        onSuccess();
      } else {
        // Failed the screen: persist as 'blocked' so it is never public, and
        // show the seller a distinct block experience instead of a success flow.
        const blocked = await createListing(user.email, input, {
          status: 'blocked',
          screening_result: 'blocked',
          screening_reason: screening.reason,
        });
        setBlockedListing(blocked);
        setBlockedModalVisible(true);
      }
    } catch (error) {
      setGlobalError('Failed to create listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Blocked-listing flow (FE-6 Step 2)
  const handleEditAndResubmit = () => {
    setBlockedModalVisible(false);
    setBlockedListing(null);
  };

  const handleOpenAppeal = () => {
    setBlockedModalVisible(false);
    setAppealVisible(true);
  };

  const handleCancelAppeal = () => {
    setAppealVisible(false);
    setBlockedListing(null);
  };

  const handleAppealSubmit = async (message: string) => {
    if (!blockedListing) return;
    try {
      await submitAppeal(blockedListing.id, message);
      setAppealVisible(false);
      setAppealSubmitted(true);
    } catch (error) {
      setGlobalError('Failed to submit appeal. Please try again.');
    }
  };

  const handleAppealDone = () => {
    setAppealSubmitted(false);
    setBlockedListing(null);
    // Blocked listing stays hidden from the public feed; return to browse.
    onSuccess();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="pricetag-outline" size={32} color={colors.tertiary} />
          <Text style={styles.headerTitle}>Create Listing</Text>
          <Text style={styles.headerSubtitle}>
            List your item for sale in the marketplace
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Title */}
          <TextInputField
            label="Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Gojo Satoru White Wig - Heat Resistant"
            error={titleError}
          />

          {/* Description */}
          <TextAreaField
            label="Description *"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your item in detail: condition, size, materials, etc."
            error={descriptionError}
            minRows={6}
          />

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.chipContainer}>
              {MARKETPLACE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    category === cat && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setCategoryError('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chipText,
                    category === cat && styles.chipTextSelected,
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}
          </View>

          {/* Price */}
          <TextInputField
            label="Price (₱) *"
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="numeric"
            error={priceError}
          />

          {/* Condition */}
          <View style={styles.field}>
            <Text style={styles.label}>Condition *</Text>
            <View style={styles.chipContainer}>
              {Object.keys(CONDITION_LABELS).map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[
                    styles.chip,
                    condition === cond && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setCondition(cond as MarketplaceCondition);
                    setConditionError('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chipText,
                    condition === cond && styles.chipTextSelected,
                  ]}>
                    {CONDITION_LABELS[cond]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {conditionError ? <Text style={styles.errorText}>{conditionError}</Text> : null}
          </View>

          {/* Photo Note */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text style={styles.infoText}>
              Photo upload will be added in a later update. For now, describe your item thoroughly.
            </Text>
          </View>

          {/* Prohibited-items notice */}
          <View style={styles.noticeBox}>
            <Ionicons name="shield-outline" size={18} color={colors.warning} />
            <Text style={styles.noticeText}>
              This marketplace is for cosplay-related items and services only. Listings
              involving real weapons/firearms, drugs, real estate, vehicles, live animals,
              counterfeit goods, or other items outside the cosplay community will be
              automatically blocked from publishing.
            </Text>
          </View>

          {globalError ? <Text style={styles.globalError}>{globalError}</Text> : null}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={isLoading ? 'Creating...' : 'Create Listing'}
          onPress={handleSubmit}
          variant="primary"
          fullWidth
          disabled={isLoading}
        />
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loadingIndicator}
          />
        )}
      </View>

      {/* FE-6 Step 2: block notice shown when the listing fails the category screen */}
      <ListingBlockedModal
        visible={blockedModalVisible}
        reason={blockedListing?.screening_reason ?? ''}
        onEdit={handleEditAndResubmit}
        onAppeal={handleOpenAppeal}
      />

      {/* FE-6 Step 2: seller appeal text input */}
      <AppealModal
        visible={appealVisible}
        listingTitle={blockedListing?.title ?? ''}
        onCancel={handleCancelAppeal}
        onSubmit={handleAppealSubmit}
      />

      {/* FE-6 Step 2: appeal submitted confirmation */}
      <ConfirmationModal
        visible={appealSubmitted}
        title="Appeal Submitted"
        message="Your appeal has been submitted for review by a Holder. You'll be notified once a decision is made."
        confirmText="Got it"
        cancelText=""
        onConfirm={handleAppealDone}
        onCancel={handleAppealDone}
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
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.tertiary,
    borderColor: colors.tertiary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.backgroundLight,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '12',
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  globalError: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    backgroundColor: colors.error + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  loadingIndicator: {
    marginTop: spacing.sm,
  },
});
