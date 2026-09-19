/**
 * Verify Cosplayers Screen - Head Organizers Only
 * Allows Head Organizers to verify cosplayers for marketplace access
 * 
 * Features:
 * - List all cosplayers with pending verification
 * - Approve/Reject verification requests
 * - View verified cosplayers
 * - Revoke marketplace access if needed
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { formatVerificationStatus } from '../../utils/formatStatus';
import { AuthService, StoredAccount } from '../../services/AuthService';
import { RejectionReasonModal, ConfirmationModal } from '../../components';


type VerificationFilter = 'pending' | 'verified' | 'all';

export const VerifyCosplayersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useUser();
  const [cosplayers, setCosplayers] = useState<StoredAccount[]>([]);
  const [filteredCosplayers, setFilteredCosplayers] = useState<StoredAccount[]>([]);
  const [filter, setFilter] = useState<VerificationFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [revealedPayoutFor, setRevealedPayoutFor] = useState<string | null>(null);
  
  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [cosplayerToReject, setCosplayerToReject] = useState<StoredAccount | null>(null);
  
  // NEW: Approval confirmation modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [cosplayerToApprove, setCosplayerToApprove] = useState<StoredAccount | null>(null);
  
  // NEW: Success notification modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // NEW: Revoke confirmation modal state
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [cosplayerToRevoke, setCosplayerToRevoke] = useState<StoredAccount | null>(null);

  // Load cosplayers
  useEffect(() => {
    loadCosplayers();
  }, []);

  // Filter cosplayers based on verification status and search
  useEffect(() => {
    let filtered = cosplayers;

    // Filter by verification status
    if (filter === 'pending') {
      // Only show cosplayers who have submitted marketplace registration
      filtered = filtered.filter(c => 
        c.verification_status === 'pending' && c.marketplace_registration
      );
    } else if (filter === 'verified') {
      filtered = filtered.filter(c => c.verification_status === 'verified');
    }

    // Filter by search query (name or email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.display_name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
      );
    }

    setFilteredCosplayers(filtered);
  }, [cosplayers, filter, searchQuery]);

  const loadCosplayers = async () => {
    setLoading(true);
    try {
      const accounts = await AuthService.getAccounts();
      // Only show cosplayers (exclude organizers and self)
      const cosplayerAccounts = accounts.filter(
        acc => acc.is_cosplayer && acc.email !== user?.email
      );
      setCosplayers(cosplayerAccounts);
    } catch (error) {
      console.error('[VerifyCosplayers] Failed to load cosplayers:', error);
      // Error handling: User will see empty state if load fails
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (cosplayer: StoredAccount, approve: boolean) => {
    if (approve) {
      // Approve: show confirmation modal
      setCosplayerToApprove(cosplayer);
      setShowApprovalModal(true);
    } else {
      // Reject: show reason modal
      setCosplayerToReject(cosplayer);
      setShowRejectionModal(true);
    }
  };

  const handleApprovalConfirm = async () => {
    if (!cosplayerToApprove) return;

    setShowApprovalModal(false);

    try {
      await AuthService.updateVerificationStatus(cosplayerToApprove.email, 'verified');
      setSuccessMessage(`${cosplayerToApprove.display_name} approved`);
      setShowSuccessModal(true);
      setCosplayerToApprove(null);
      loadCosplayers(); // Refresh list
    } catch (error) {
      setSuccessMessage('Error: Failed to approve application');
      setShowSuccessModal(true);
    }
  };

  const handleApprovalCancel = () => {
    setShowApprovalModal(false);
    setCosplayerToApprove(null);
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!cosplayerToReject) return;

    try {
      await AuthService.updateVerificationStatus(
        cosplayerToReject.email,
        'rejected',
        reason
      );
      setSuccessMessage(`${cosplayerToReject.display_name}'s application was rejected`);
      setShowSuccessModal(true);
      setShowRejectionModal(false);
      setCosplayerToReject(null);
      loadCosplayers(); // Refresh list
    } catch (error) {
      setSuccessMessage('Error: Failed to reject application');
      setShowSuccessModal(true);
    }
  };

  const handleRejectCancel = () => {
    setShowRejectionModal(false);
    setCosplayerToReject(null);
  };

  const handleRevoke = async (cosplayer: StoredAccount) => {
    // Show confirmation modal for revoke action
    setCosplayerToRevoke(cosplayer);
    setShowRevokeModal(true);
  };
  
  const handleRevokeConfirm = async () => {
    if (!cosplayerToRevoke) return;
    
    try {
      await AuthService.updateVerificationStatus(cosplayerToRevoke.email, 'revoked');
      setSuccessMessage(`Marketplace access revoked for ${cosplayerToRevoke.display_name}.`);
      setShowSuccessModal(true);
      setShowRevokeModal(false);
      setCosplayerToRevoke(null);
      loadCosplayers();
    } catch (error) {
      setSuccessMessage('Error: Failed to revoke access');
      setShowSuccessModal(true);
      setShowRevokeModal(false);
      setCosplayerToRevoke(null);
    }
  };
  
  const handleRevokeCancel = () => {
    setShowRevokeModal(false);
    setCosplayerToRevoke(null);
  };

  const renderCosplayerCard = (cosplayer: StoredAccount) => {
    const isPending = cosplayer.verification_status === 'pending';
    const isVerified = cosplayer.verification_status === 'verified';
    const isRejected = cosplayer.verification_status === 'rejected';
    const marketplaceReg = cosplayer.marketplace_registration;
    const payoutRevealed = revealedPayoutFor === cosplayer.email;

    return (
      <View key={cosplayer.email} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {cosplayer.display_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{cosplayer.display_name}</Text>
            <Text style={styles.cardEmail}>{cosplayer.email}</Text>
          </View>
          <View style={[
            styles.badge,
            isVerified && styles.badgeSuccess,
            isPending && styles.badgeWarning,
            isRejected && styles.badgeError,
          ]}>
            <Text style={[
              styles.badgeText,
              isVerified && styles.badgeTextSuccess,
              isPending && styles.badgeTextWarning,
              isRejected && styles.badgeTextError,
            ]}>
              {formatVerificationStatus(cosplayer.verification_status)}
            </Text>
          </View>
        </View>

        {/* Marketplace Registration Details (if submitted) */}
        {marketplaceReg && (
          <View style={styles.registrationDetails}>
            {/* STEP 2: Role tag */}
            <View style={styles.roleTagContainer}>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>
                  {marketplaceReg.marketplace_role === 'buyer' && 'Buyer'}
                  {marketplaceReg.marketplace_role === 'seller' && 'Seller'}
                  {marketplaceReg.marketplace_role === 'both' && 'Buyer & Seller'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Display Name:</Text>
              <Text style={styles.detailValue}>{marketplaceReg.seller_display_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Contact:</Text>
              <Text style={styles.detailValue}>{marketplaceReg.contact_email}</Text>
            </View>
            {marketplaceReg.contact_phone && (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{marketplaceReg.contact_phone}</Text>
              </View>
            )}

            {/* STEP 2: Only show payout info for seller or both */}
            {(marketplaceReg.marketplace_role === 'seller' || marketplaceReg.marketplace_role === 'both') && (
              <>
                <View style={styles.detailRow}>
                  <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailLabel}>Payout:</Text>
                  <Text style={styles.detailValue}>{marketplaceReg.payout_method_label}</Text>
                </View>
                {/* Payout number: hidden by default, tap to reveal */}
                <TouchableOpacity
                  style={styles.revealButton}
                  onPress={() =>
                    setRevealedPayoutFor(payoutRevealed ? null : cosplayer.email)
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={payoutRevealed ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.revealButtonText}>
                    {payoutRevealed ? 'Hide' : 'Show'} Payout Number
                  </Text>
                </TouchableOpacity>
                {payoutRevealed && (
                  <View style={styles.payoutNumberBox}>
                    <Text style={styles.payoutNumberText}>{marketplaceReg.payout_method_number}</Text>
                    <Text style={styles.mockWarning}>⚠️ MOCK FIELD (not encrypted)</Text>
                  </View>
                )}
              </>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Submitted:</Text>
              <Text style={styles.detailValue}>
                {new Date(marketplaceReg.submitted_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        )}

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleVerify(cosplayer, true)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.backgroundLight} />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleVerify(cosplayer, false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color={colors.backgroundLight} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {isVerified && (
          <TouchableOpacity
            style={[styles.actionButton, styles.revokeButton]}
            onPress={() => handleRevoke(cosplayer)}
            activeOpacity={0.7}
          >
            <Ionicons name="ban" size={16} color={colors.error} />
            <Text style={styles.revokeButtonText}>Revoke Access</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Verify Cosplayers</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'verified' && styles.filterTabActive]}
          onPress={() => setFilter('verified')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterTabText, filter === 'verified' && styles.filterTabTextActive]}>
            Verified
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading cosplayers...</Text>
        </View>
      ) : filteredCosplayers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={colors.textDisabled} />
          <Text style={styles.emptyStateTitle}>
            {filter === 'pending' ? 'No Pending Requests' : 
             filter === 'verified' ? 'No Verified Cosplayers' : 
             'No Cosplayers Found'}
          </Text>
          <Text style={styles.emptyStateText}>
            {searchQuery.trim() 
              ? 'Try adjusting your search.'
              : filter === 'pending'
              ? 'There are no cosplayers awaiting verification.'
              : 'No cosplayers match this filter.'}
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredCosplayers.map(renderCosplayerCard)}
        </ScrollView>
      )}

      {/* Rejection Reason Modal */}
      <RejectionReasonModal
        visible={showRejectionModal}
        applicantName={cosplayerToReject?.display_name || ''}
        onCancel={handleRejectCancel}
        onSubmit={handleRejectSubmit}
      />

      {/* Approval Confirmation Modal */}
      <ConfirmationModal
        visible={showApprovalModal}
        title="Approve Application"
        message={`Approve this application? ${cosplayerToApprove?.display_name || ''} will gain Marketplace access.`}
        confirmText="Approve"
        cancelText="Cancel"
        onConfirm={handleApprovalConfirm}
        onCancel={handleApprovalCancel}
      />

      {/* Success Notification Modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        title={successMessage.startsWith('Error') ? 'Error' : 'Success'}
        message={successMessage}
        confirmText="OK"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
      
      {/* Revoke Confirmation Modal */}
      <ConfirmationModal
        visible={showRevokeModal}
        title="Revoke Access"
        message={`Are you sure you want to revoke marketplace access for ${cosplayerToRevoke?.display_name || ''}? They will need to be re-verified.`}
        confirmText="Revoke"
        onConfirm={handleRevokeConfirm}
        onCancel={handleRevokeCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.backgroundLight,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.backgroundLight,
    ...typography.h3,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  cardEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  badgeSuccess: {
    backgroundColor: colors.success + '20',
  },
  badgeWarning: {
    backgroundColor: colors.warning + '20',
  },
  badgeError: {
    backgroundColor: colors.error + '20',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  badgeTextSuccess: {
    color: colors.success,
  },
  badgeTextWarning: {
    color: colors.warning,
  },
  badgeTextError: {
    color: colors.error,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  revokeButton: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: spacing.sm,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.backgroundLight,
    fontWeight: '600',
  },
  revokeButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  registrationDetails: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  // STEP 2: Role tag styles
  roleTagContainer: {
    marginBottom: spacing.sm,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  roleTagText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  revealButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  payoutNumberBox: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  payoutNumberText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mockWarning: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
