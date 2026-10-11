/**
 * Create Listing Screen - Sellers Only (FE-6 Step 1)
 * Create marketplace listing with validation
 */

import React, { useState, useRef, useEffect } from 'react';
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
import { TextInputField, TextAreaField, Button, ConfirmationModal, PhotoUploadSection } from '../../components';
import { MARKETPLACE_CATEGORIES, CONDITION_LABELS } from '../../constants/marketplaceCategories';
import { MarketplaceCondition, TransactionType } from '../../types/marketplace';
import { checkListing } from '../../services/MarketplaceService';
import { sanitizeDecimalInput } from '../../utils/numericInput';
import { MAX_AMOUNT_PHP } from '../../utils/marketplaceLimits';
import { showNotice } from '../../utils/appNotice';
import PhotoService from '../../services/PhotoService';

interface CreateListingScreenProps {
  onSuccess: () => void;
}

export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({ onSuccess }) => {
  const navigation = useNavigation();
  const { user } = useUser();
  const { createListing } = useMarketplace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType | ''>('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<MarketplaceCondition | ''>('');
  const [photoIds, setPhotoIds] = useState<string[]>([]);

  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [transactionTypeError, setTransactionTypeError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [conditionError, setConditionError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Duplicate listing modal
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  // Track uploaded photos for cleanup
  const uploadedPhotoIdsRef = useRef<string[]>([]);

  useEffect(() => {
    uploadedPhotoIdsRef.current = photoIds;
  }, [photoIds]);

  // Cleanup unattached photos on unmount
  useEffect(() => {
    return () => {
      const idsToDelete = uploadedPhotoIdsRef.current;
      if (idsToDelete.length > 0) {
        // Best-effort cleanup - fire and forget
        Promise.all(idsToDelete.map((id) => PhotoService.deletePhoto(id))).catch(() => {});
      }
    };
  }, []);

  const validateFields = (): boolean => {
    let isValid = true;

    // Reset errors
    setTitleError('');
    setDescriptionError('');
    setCategoryError('');
    setTransactionTypeError('');
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

    // Transaction Type
    if (!transactionType) {
      setTransactionTypeError('Please select transaction type');
      isValid = false;
    }

    // Price (required for 'buy' or 'both', optional for 'trade')
    const priceNum = price ? Number(price) : NaN;
    if (transactionType === 'buy' || transactionType === 'both') {
      if (!price.trim()) {
        setPriceError('Price is required for Buy transactions');
        isValid = false;
      } else if (isNaN(priceNum) || priceNum <= 0) {
        setPriceError('Please enter a valid price greater than 0');
        isValid = false;
      }
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

    // Pre-submit moderation check
    setIsLoading(true);
    setGlobalError('');
    setTitleError('');
    setDescriptionError('');

    const checkResult = await checkListing({
      title: title.trim(),
      description: description.trim(),
      category,
    });

    if (!checkResult.ok) {
      setIsLoading(false);
      // Fail closed: network, auth, rate limit, validation, or server error blocks the save
      if (checkResult.error.kind === 'rate_limit') {
        showNotice('error', checkResult.error.message);
        setGlobalError(checkResult.error.message);
      } else if (checkResult.error.kind === 'validation') {
        // Backend validation error (e.g. invalid category) - show specific message
        const msg = checkResult.error.message || 'Please check your information and try again.';
        showNotice('error', msg);
        setGlobalError(msg);
      } else if (checkResult.error.kind === 'network' || checkResult.error.kind === 'server') {
        const msg = "Can't check your listing right now. Try again.";
        showNotice('error', msg);
        setGlobalError(msg);
      } else if (checkResult.error.kind === 'auth') {
        showNotice('error', checkResult.error.message);
        setGlobalError(checkResult.error.message);
      } else {
        const msg = 'Unable to verify listing content. Please try again.';
        showNotice('error', msg);
        setGlobalError(msg);
      }
      return;
    }

    if (!checkResult.data.allowed) {
      // Moderation blocked the listing: show per-field violations
      setIsLoading(false);
      const violations = checkResult.data.violations;
      let scrolled = false;
      for (const violation of violations) {
        if (violation.field === 'title') {
          setTitleError(violation.message);
          if (!scrolled) scrolled = true;
        } else if (violation.field === 'description') {
          setDescriptionError(violation.message);
          if (!scrolled) scrolled = true;
        }
      }
      if (violations.length > 0 && !violations.some((v) => v.field === 'title' || v.field === 'description')) {
        const msg = 'This listing cannot be published. Please review the guidelines.';
        showNotice('warning', msg);
        setGlobalError(msg);
      }
      return;
    }

    // Moderation passed: save the listing
    const input = {
      title: title.trim(),
      description: description.trim(),
      category,
      transaction_type: transactionType as TransactionType,
      price: transactionType === 'trade' ? 0 : Number(price),
      condition: condition as MarketplaceCondition,
      photos: [], // Legacy field
      photo_ids: photoIds, // New - attach uploaded photos
    };

    try {
      const result = await createListing(user.email, input);
      
      if (!result.success) {
        // Handle field errors (422 listing_quality)
        if (result.fieldErrors) {
          if (result.fieldErrors.title) setTitleError(result.fieldErrors.title);
          if (result.fieldErrors.description) setDescriptionError(result.fieldErrors.description);
          if (result.fieldErrors.trade_offered_item) {
            // For trade item errors, show in global error for now
            const msg = result.error || 'Please check your input and try again.';
            showNotice('error', msg);
            setGlobalError(msg);
          }
          if (result.fieldErrors.trade_wanted_item) {
            const msg = result.error || 'Please check your input and try again.';
            showNotice('error', msg);
            setGlobalError(msg);
          }
        } else {
          // Plain error message (409 duplicate, 422 moderation, etc.)
          const errorMsg = result.error || 'Failed to create listing. Please try again.';
          // If it looks like a duplicate message, show in modal
          if (errorMsg.toLowerCase().includes('duplicate') || errorMsg.toLowerCase().includes('already exists')) {
            showNotice('warning', errorMsg);
            setDuplicateMessage(errorMsg);
            setDuplicateModalVisible(true);
          } else {
            showNotice('error', errorMsg);
            setGlobalError(errorMsg);
          }
        }
        setIsLoading(false);
        return;
      }
      
      // Clear the ref so cleanup on unmount doesn't delete attached photos
      uploadedPhotoIdsRef.current = [];
      showNotice('success', 'Listing created successfully!');
      onSuccess();
    } catch (error) {
      const msg = 'Failed to create listing. Please try again.';
      showNotice('error', msg);
      setGlobalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Field errors clear when the user edits
  const handleTitleChange = (text: string) => {
    setTitle(text);
    if (titleError) setTitleError('');
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    if (descriptionError) setDescriptionError('');
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
            onChangeText={handleTitleChange}
            placeholder="e.g., Gojo Satoru White Wig - Heat Resistant"
            error={titleError}
          />

          {/* Description */}
          <TextAreaField
            label="Description *"
            value={description}
            onChangeText={handleDescriptionChange}
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

          {/* Transaction Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Transaction Type *</Text>
            <Text style={styles.helperText}>How do you want to receive payment?</Text>
            <View style={styles.transactionTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.transactionTypeButton,
                  transactionType === 'buy' && styles.transactionTypeButtonSelected,
                ]}
                onPress={() => {
                  setTransactionType('buy');
                  setTransactionTypeError('');
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="cash-outline" 
                  size={24} 
                  color={transactionType === 'buy' ? colors.backgroundLight : colors.textSecondary} 
                />
                <Text style={[
                  styles.transactionTypeText,
                  transactionType === 'buy' && styles.transactionTypeTextSelected,
                ]}>
                  Buy
                </Text>
                <Text style={[
                  styles.transactionTypeSubtext,
                  transactionType === 'buy' && styles.transactionTypeSubtextSelected,
                ]}>
                  Monetary payment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.transactionTypeButton,
                  transactionType === 'trade' && styles.transactionTypeButtonSelected,
                ]}
                onPress={() => {
                  setTransactionType('trade');
                  setTransactionTypeError('');
                  setPrice(''); // Clear price for trade-only
                  setPriceError('');
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="swap-horizontal-outline" 
                  size={24} 
                  color={transactionType === 'trade' ? colors.backgroundLight : colors.textSecondary} 
                />
                <Text style={[
                  styles.transactionTypeText,
                  transactionType === 'trade' && styles.transactionTypeTextSelected,
                ]}>
                  Trade
                </Text>
                <Text style={[
                  styles.transactionTypeSubtext,
                  transactionType === 'trade' && styles.transactionTypeSubtextSelected,
                ]}>
                  Item exchange
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.transactionTypeButton,
                  transactionType === 'both' && styles.transactionTypeButtonSelected,
                ]}
                onPress={() => {
                  setTransactionType('both');
                  setTransactionTypeError('');
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="options-outline" 
                  size={24} 
                  color={transactionType === 'both' ? colors.backgroundLight : colors.textSecondary} 
                />
                <Text style={[
                  styles.transactionTypeText,
                  transactionType === 'both' && styles.transactionTypeTextSelected,
                ]}>
                  Both
                </Text>
                <Text style={[
                  styles.transactionTypeSubtext,
                  transactionType === 'both' && styles.transactionTypeSubtextSelected,
                ]}>
                  Open to either
                </Text>
              </TouchableOpacity>
            </View>
            {transactionTypeError ? <Text style={styles.errorText}>{transactionTypeError}</Text> : null}
          </View>

          {/* Price */}
          <TextInputField
            label={transactionType === 'trade' ? 'Price (₱) - Optional for Trade' : 'Price (₱) *'}
            value={price}
            onChangeText={(text) => setPrice(sanitizeDecimalInput(text, { maxDecimals: 2, maxDigits: 7 }))}
            placeholder={transactionType === 'trade' ? 'N/A for trade-only' : '0.00'}
            keyboardType="numeric"
            inputMode="decimal"
            error={priceError}
          />
          {price && Number(price) > MAX_AMOUNT_PHP && (
            <Text style={styles.limitMessage}>Maximum is ₱{MAX_AMOUNT_PHP.toLocaleString()}</Text>
          )}

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

          {/* Photos */}
          <PhotoUploadSection
            onPhotosChange={setPhotoIds}
            disabled={isLoading}
          />

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

      {/* Duplicate Listing Modal */}
      <ConfirmationModal
        visible={duplicateModalVisible}
        title="Duplicate Listing"
        message={duplicateMessage}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setDuplicateModalVisible(false)}
        onCancel={() => setDuplicateModalVisible(false)}
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
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  transactionTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  transactionTypeButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  transactionTypeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  transactionTypeText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  transactionTypeTextSelected: {
    color: colors.backgroundLight,
  },
  transactionTypeSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transactionTypeSubtextSelected: {
    color: colors.backgroundLight,
    opacity: 0.9,
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
  limitMessage: {
    ...typography.caption,
    color: colors.warning,
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
