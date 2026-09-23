import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useLogistics } from '../../contexts/LogisticsContext';
import { Button, ConfirmationModal } from '../../components';
import { OrganizerService } from '../../services/OrganizerService';
import { OrganizerAccessRequest, DEPARTMENT_LABELS } from '../../types/organizer';
import { formatVerificationStatus, formatDepartmentVerificationStatus } from '../../utils/formatStatus';

export const ProfileScreen: React.FC = () => {
  const { user, logout, resetOnboarding, updateVerification } = useUser();
  const { reseedData } = useLogistics();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [accessRequest, setAccessRequest] = useState<OrganizerAccessRequest | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  
  // Modal states
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showReseedLogisticsModal, setShowReseedLogisticsModal] = useState(false);

  // Load access request when screen is focused
  useEffect(() => {
    if (user?.is_organizer && !user?.organizer_role && isFocused) {
      loadAccessRequest();
    }
  }, [user?.is_organizer, user?.organizer_role, isFocused]);

  const loadAccessRequest = async () => {
    if (!user?.email) return;
    
    setLoadingRequest(true);
    try {
      const request = await OrganizerService.getAccessRequestByUserId(user.email);
      setAccessRequest(request);
    } catch (error) {
      // No request is fine
      setAccessRequest(null);
    } finally {
      setLoadingRequest(false);
    }
  };

  const initials = (user?.display_name ?? 'U')
    .split(' ')
    .map(s => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const handleLogout = () => {
    setShowLogoutModal(true);
  };
  
  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const handleResetOnboarding = () => {
    setShowResetModal(true);
  };
  
  const confirmReset = () => {
    setShowResetModal(false);
    resetOnboarding();
  };

  const handleReseedLogistics = () => {
    setShowReseedLogisticsModal(true);
  };

  const confirmReseedLogistics = async () => {
    setShowReseedLogisticsModal(false);
    await reseedData();
  };

  // Determine if user is viewing as organizer
  const isOrganizerView = user?.is_organizer && !user?.is_cosplayer;
  const isCosplayerView = user?.is_cosplayer;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + name */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.displayName}>{user?.display_name ?? 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Role badges */}
      <View style={styles.badgeRow}>
        {user?.is_cosplayer && (
          <View style={[styles.badge, { backgroundColor: '#F0EAFF' }]}>
            <Ionicons name="color-palette-outline" size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>Cosplayer</Text>
          </View>
        )}
        {user?.is_organizer && user?.organizer_role === 'head' && (
          <View style={[styles.badge, { backgroundColor: '#FFE8EF' }]}>
            <Ionicons name="star-outline" size={14} color={colors.secondary} />
            <Text style={[styles.badgeText, { color: colors.secondary }]}>Head Organizer</Text>
          </View>
        )}
        {user?.is_organizer && user?.organizer_role === 'staff' && (
          <View style={[styles.badge, { backgroundColor: '#FFE8EF' }]}>
            <Ionicons name="people-outline" size={14} color={colors.secondary} />
            <Text style={[styles.badgeText, { color: colors.secondary }]}>
              Staff Organizer
            </Text>
          </View>
        )}
        {user?.is_organizer && !user?.organizer_role && (
          <View style={[styles.badge, { backgroundColor: '#FFE8EF' }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.secondary} />
            <Text style={[styles.badgeText, { color: colors.secondary }]}>Organizer</Text>
          </View>
        )}
      </View>

      {/* Body info — COSPLAYER ONLY */}
      {isCosplayerView && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Body Representation</Text>
          <View style={styles.detailRow}>
            <Ionicons name="male-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Base body</Text>
            <Text style={styles.detailValue}>
              {user?.base_body_selection === 'male' ? 'Male' : 'Female'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="resize-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Size</Text>
            <Text style={styles.detailValue}>{user?.body_size_slider?.toFixed(2) ?? '0.50'}</Text>
          </View>
        </View>
      )}

      {/* Organizer Access - ALL ORGANIZERS (shows request status) */}
      {user?.is_organizer && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Organizer Access</Text>
          
          {user?.organizer_role ? (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="shield-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { color: colors.success }]}>
                  {user?.organizer_role === 'head' ? 'Head Organizer' : 'Staff Member'}
                </Text>
              </View>
              
              {/* Head Organizer: Show department */}
              {user?.organizer_role === 'head' && user?.head_organizer_department && (
                <View style={styles.detailRow}>
                  <Ionicons name="briefcase-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.detailLabel}>Department</Text>
                  <Text style={styles.detailValue}>
                    {DEPARTMENT_LABELS[user.head_organizer_department]}
                  </Text>
                </View>
              )}
              
              <Text style={styles.cardNote}>
                {user?.organizer_role === 'head'
                  ? 'You have access to create and manage events.'
                  : 'You are a staff member for an event.'}
              </Text>
            </>
          ) : loadingRequest ? (
            <View style={{ padding: spacing.md, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : accessRequest ? (
            <>
              <View style={styles.detailRow}>
                <Ionicons 
                  name={
                    accessRequest.status === 'pending' ? 'time-outline' :
                    accessRequest.status === 'approved' ? 'checkmark-circle-outline' :
                    'close-circle-outline'
                  }
                  size={18} 
                  color={
                    accessRequest.status === 'pending' ? colors.warning :
                    accessRequest.status === 'approved' ? colors.success :
                    colors.error
                  } 
                />
                <Text style={styles.detailLabel}>Request Status</Text>
                <Text style={[
                  styles.detailValue,
                  { 
                    color: accessRequest.status === 'pending' ? colors.warning :
                           accessRequest.status === 'approved' ? colors.success :
                           colors.error
                  }
                ]}>
                  {accessRequest.status.charAt(0).toUpperCase() + accessRequest.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.cardNote}>
                {accessRequest.status === 'pending' && 'Your request is being reviewed by our team.'}
                {accessRequest.status === 'approved' && 'Your request was approved!'}
                {accessRequest.status === 'rejected' && 'Your request was not approved. Contact support for more info.'}
              </Text>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => navigation.navigate('RequestOrganizerAccess')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardButtonText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardNote}>
                Submit a request to become an Event Organizer and create your own events.
              </Text>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => navigation.navigate('RequestOrganizerAccess')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardButtonText}>Request Access</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Marketplace Verification — Head Organizers can verify cosplayers */}
      {/* Marketplace Access - COSPLAYERS ONLY */}
      {user?.is_cosplayer && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Marketplace Access</Text>
          <View style={styles.detailRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Verification Status</Text>
            <Text style={[
              styles.detailValue,
              user?.verification_status === 'verified' && { color: colors.success },
              user?.verification_status === 'pending' && { color: colors.warning },
              (user?.verification_status === 'rejected' || user?.verification_status === 'revoked') && { color: colors.error },
            ]}>
              {user?.verification_status
                ? formatVerificationStatus(user.verification_status)
                : 'Not Submitted'}
            </Text>
          </View>
          <Text style={styles.cardNote}>
            {user?.verification_status === 'verified'
              ? 'You can list items for sale and trade in the marketplace.'
              : 'Verification required to sell or trade items.'}
          </Text>

          {/* Show rejection reason if rejected */}
          {user?.verification_status === 'rejected' && user?.marketplace_registration?.rejection_reason && (
            <View style={styles.rejectionBox}>
              <View style={styles.rejectionHeader}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.rejectionTitle}>Reason for rejection:</Text>
              </View>
              <Text style={styles.rejectionText}>
                {user.marketplace_registration.rejection_reason}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Organizer-specific content */}
      {user?.is_organizer && user?.organizer_role === 'head' && (
        <>
          {/* Events You Organize */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Events You Organize</Text>
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={32} color={colors.textDisabled} />
              <Text style={styles.emptyStateText}>No events yet</Text>
              <Text style={styles.emptyStateHint}>
                Create your first event to start managing guests, performers, and logistics.
              </Text>
            </View>
          </View>

          {/* Manage Staff */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Team Management</Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => navigation.navigate('ManageStaff')}
                activeOpacity={0.7}
              >
                <Text style={styles.manageButtonText}>Manage Staff</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardNote}>
              Approve new staff members and assign departments with "Verify Staff by Department". View approved staff and their current assignments with "Manage Staff".
            </Text>
            {/* Verify Staff — single-department scope */}
            <TouchableOpacity
              style={styles.cardButton}
              onPress={() => navigation.navigate('VerifyStaff')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardButtonText}>Verify Staff by Department</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Marketplace Management */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Marketplace Management</Text>
            <Text style={styles.cardNote}>
              Verify cosplayers for marketplace access. Review their registration details and approve or reject their requests.
            </Text>
            <TouchableOpacity
              style={styles.cardButton}
              onPress={() => navigation.navigate('VerifyCosplayers')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardButtonText}>Verify Cosplayers for Marketplace</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Logistics Preview */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Logistics Overview</Text>
            <Text style={styles.cardNote}>
              Track guest arrival times, parking needs, entourage sizes, stage-time requirements, and more.
            </Text>
            <View style={styles.logisticsRow}>
              <View style={styles.logisticsStat}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.logisticsLabel}>Arrivals</Text>
                <Text style={styles.logisticsValue}>—</Text>
              </View>
              <View style={styles.logisticsStat}>
                <Ionicons name="car-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.logisticsLabel}>Parking</Text>
                <Text style={styles.logisticsValue}>—</Text>
              </View>
              <View style={styles.logisticsStat}>
                <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.logisticsLabel}>Entourage</Text>
                <Text style={styles.logisticsValue}>—</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Community Calendar - visible to approved staff and Head Organizers */}
      {user?.is_organizer && (user?.organizer_role === 'head' || (user?.organizer_role === 'staff' && user?.department_verification_status === 'approved')) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Community Event Calendar</Text>
          <Text style={styles.cardNote}>
            {user.organizer_role === 'head' 
              ? 'Submit and manage community event listings visible to all cosplayers. Moderated by staff and Head Organizers.'
              : user.organizer_role === 'staff' && user.department_verification_status === 'approved'
              ? 'Submit and manage community event listings for cosplayers to discover upcoming events.'
              : 'View community event listings submitted by staff and organizers.'}
          </Text>
          <TouchableOpacity
            style={styles.cardButton}
            onPress={() => navigation.navigate('CalendarManage')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardButtonText}>
              {user.organizer_role === 'head' || (user.organizer_role === 'staff' && user.department_verification_status === 'approved')
                ? 'Manage Calendar Listings'
                : 'Browse Calendar'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Calendar Approval Queue - Head Organizers only */}
      {user?.is_organizer && user?.organizer_role === 'head' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calendar Moderation</Text>
          <Text style={styles.cardNote}>
            Review and approve calendar submissions from staff members in your department before they become visible to cosplayers.
          </Text>
          <TouchableOpacity
            style={styles.cardButton}
            onPress={() => navigation.navigate('CalendarApproval')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardButtonText}>Approval Queue</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {user?.is_organizer && user?.organizer_role === 'staff' && (
        <>
          {/* Staff Assignment Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Assignment</Text>
            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>
                {user.department ? DEPARTMENT_LABELS[user.department] : 'None selected'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[
                styles.detailValue,
                user.department_verification_status === 'approved' && { color: colors.success },
                user.department_verification_status === 'pending' && { color: colors.warning },
                user.department_verification_status === 'rejected' && { color: colors.error },
              ]}>
                {user.department_verification_status
                  ? formatDepartmentVerificationStatus(user.department_verification_status)
                  : 'Not registered'}
              </Text>
            </View>
            <Text style={styles.cardNote}>
              Your department assignment and verification status. Head Organizers verify staff members for specific departments.
            </Text>

            {/* Show rejection reason if rejected */}
            {user.department_verification_status === 'rejected' && user.department_rejection_reason && (
              <View style={styles.rejectionBox}>
                <View style={styles.rejectionHeader}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.rejectionTitle}>Reason for rejection:</Text>
                </View>
                <Text style={styles.rejectionText}>
                  {user.department_rejection_reason}
                </Text>
              </View>
            )}
          </View>

          {/* Staff Capabilities */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What You Can Do</Text>
            <View style={styles.capabilityRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.capabilityText}>View events you're assigned to</Text>
            </View>
            <View style={styles.capabilityRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.capabilityText}>Manage department-specific logistics</Text>
            </View>
            <View style={styles.capabilityRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.capabilityText}>View and RSVP to meetups</Text>
            </View>
            <View style={styles.capabilityRow}>
              <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
              <Text style={[styles.capabilityText, { color: colors.textDisabled }]}>Create or edit events (Head Organizer only)</Text>
            </View>
            <View style={styles.capabilityRow}>
              <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
              <Text style={[styles.capabilityText, { color: colors.textDisabled }]}>Verify marketplace users (Head Organizer only)</Text>
            </View>
          </View>
        </>
      )}

      {/* App info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Info</Text>
        <View style={styles.detailRow}>
          <Ionicons name="code-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Version</Text>
          <Text style={styles.detailValue}>FE-5.5-prep (Organizer Profile)</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="flask-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Mode</Text>
          <Text style={styles.detailValue}>Demo (mock data)</Text>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.logoutWrap}>
        <Button
          title="Log Out"
          variant="secondary"
          onPress={handleLogout}
          fullWidth
        />
        {__DEV__ && (
          <>
            <Button
              title="Reset Onboarding (Delete All Accounts)"
              variant="destructive"
              onPress={handleResetOnboarding}
              fullWidth
            />
            {user?.is_organizer && user?.organizer_role === 'head' && (
              <Button
                title="Reseed Logistics Data (Test Mode)"
                variant="secondary"
                onPress={handleReseedLogistics}
                fullWidth
              />
            )}
          </>
        )}
      </View>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Log Out"
        message="This will log you out and return you to the login screen. Your account will be saved."
        confirmText="Log Out"
        confirmStyle="destructive"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Reset Onboarding Confirmation Modal */}
      <ConfirmationModal
        visible={showResetModal}
        title="Reset Onboarding"
        message="This will DELETE ALL ACCOUNTS and return you to the Welcome screen. This cannot be undone."
        confirmText="Delete All"
        confirmStyle="destructive"
        onConfirm={confirmReset}
        onCancel={() => setShowResetModal(false)}
      />

      {/* Reseed Logistics Confirmation Modal */}
      <ConfirmationModal
        visible={showReseedLogisticsModal}
        title="Reseed Logistics Data"
        message="This will replace all logistics entries with fresh test data (dates relative to today). Use this to test urgency states."
        confirmText="Reseed"
        confirmStyle="default"
        onConfirm={confirmReseedLogistics}
        onCancel={() => setShowReseedLogisticsModal(false)}
      />

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: colors.backgroundLight,
    ...typography.h2,
    fontWeight: '700',
  },
  displayName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  email: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  cardNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  rejectionBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    borderRadius: borderRadius.md,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  rejectionTitle: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rejectionText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  emptyStateHint: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  manageButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  logisticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logisticsStat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logisticsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  logisticsValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  testNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  personaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  personaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  personaChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  personaChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  personaChipTextActive: {
    color: colors.backgroundLight,
  },
  testHint: {
    ...typography.caption,
    color: colors.warning,
    fontStyle: 'italic',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.primary}10`,
    borderRadius: borderRadius.md,
  },
  cardButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  capabilityText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  logoutWrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxxl,
    gap: spacing.sm,
  },
});
