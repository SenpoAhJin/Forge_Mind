/**
 * Verify Staff Screen - Head Organizers Only
 * Verifies staff accounts for the ONE department they selected at registration.
 *
 * Scope is strictly single-department:
 * - A staff account is only ever verified for the department they registered under.
 * - Approving confirms membership in that department ONLY.
 * - It does NOT grant any other department, nor Head Organizer or Marketplace access.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { AuthService, StoredAccount } from '../../services/AuthService';
import { Button, RejectionReasonModal } from '../../components';
import {
  STAFF_DEPARTMENTS,
  DEPARTMENT_LABELS,
  StaffDepartment,
  DepartmentVerificationStatus,
} from '../../types/organizer';
import { formatDepartmentVerificationStatus } from '../../utils/formatStatus';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';
type DepartmentFilter = 'all' | StaffDepartment;

export const VerifyStaffScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useUser();
  const [staff, setStaff] = useState<StoredAccount[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StoredAccount[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>('all');
  const [loading, setLoading] = useState(true);
  
  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [staffToReject, setStaffToReject] = useState<StoredAccount | null>(null);

  // Load staff accounts (organizer_role === 'staff' with a department on record)
  useEffect(() => {
    loadStaff();
  }, []);

  // Filter/group staff based on status and department
  useEffect(() => {
    let filtered = staff;

    // Status filter (pending/approved/rejected/all)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        acc => acc.department_verification_status === statusFilter
      );
    }

    // Department filter — scoped to the staff account's ONE department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(acc => acc.department === departmentFilter);
    }

    // Sort by department then display name for stable grouping
    filtered = [...filtered].sort((a, b) => {
      const deptCompare = (a.department ?? '').localeCompare(b.department ?? '');
      if (deptCompare !== 0) return deptCompare;
      return a.display_name.localeCompare(b.display_name);
    });

    setFilteredStaff(filtered);
  }, [staff, statusFilter, departmentFilter]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const accounts = await AuthService.getAccounts();
      // Only organizer_role='staff' accounts that registered with a department
      const staffAccounts = accounts.filter(
        acc =>
          acc.organizer_role === 'staff' &&
          acc.is_organizer &&
          acc.department &&
          acc.email !== user?.email
      );
      setStaff(staffAccounts);
    } catch (error) {
      console.error('[VerifyStaff] Failed to load staff:', error);
      Alert.alert('Error', 'Failed to load staff accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (member: StoredAccount, approve: boolean) => {
    const deptLabel = member.department ? DEPARTMENT_LABELS[member.department] : 'unknown department';

    if (approve) {
      // Approve: show confirmation first
      Alert.alert(
        `Approve ${deptLabel} Staff`,
        `Approve this application? ${member.display_name} will gain membership in the ${deptLabel} department only.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            style: 'default',
            onPress: async () => {
              try {
                const result = await AuthService.updateDepartmentVerificationStatus(
                  member.email,
                  'approved'
                );
                if (result.success) {
                  Alert.alert('Success', `${member.display_name} approved`);
                  loadStaff();
                } else {
                  Alert.alert('Error', result.error || 'Failed to approve application.');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to approve application.');
              }
            },
          },
        ]
      );
    } else {
      // Reject: show modal for required reason
      setStaffToReject(member);
      setShowRejectionModal(true);
    }
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!staffToReject) return;

    try {
      const result = await AuthService.updateDepartmentVerificationStatus(
        staffToReject.email,
        'rejected',
        reason
      );
      if (result.success) {
        Alert.alert('Rejected', `${staffToReject.display_name}'s application was rejected`);
        setShowRejectionModal(false);
        setStaffToReject(null);
        loadStaff();
      } else {
        Alert.alert('Error', result.error || 'Failed to reject application.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject application.');
    }
  };

  const handleRejectCancel = () => {
    setShowRejectionModal(false);
    setStaffToReject(null);
  };

  const renderStatusBadge = (status: DepartmentVerificationStatus | undefined) => {
    const s = status ?? 'pending';
    return (
      <View style={[
        styles.badge,
        s === 'approved' && styles.badgeSuccess,
        s === 'pending' && styles.badgeWarning,
        s === 'rejected' && styles.badgeError,
      ]}>
        <Text style={[
          styles.badgeText,
          s === 'approved' && styles.badgeTextSuccess,
          s === 'pending' && styles.badgeTextWarning,
          s === 'rejected' && styles.badgeTextError,
        ]}>
          {formatDepartmentVerificationStatus(s)}
        </Text>
      </View>
    );
  };

  // Group staff under department headers (used when filtering by 'all')
  const groupedByDepartment = STAFF_DEPARTMENTS
    .map(dept => ({
      department: dept,
      members: filteredStaff.filter(acc => acc.department === dept),
    }))
    .filter(group => group.members.length > 0);

  const renderStaffCard = (member: StoredAccount) => {
    const isPending = member.department_verification_status === 'pending';
    const deptLabel = member.department ? DEPARTMENT_LABELS[member.department] : 'No department';

    return (
      <View key={member.email} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {member.display_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{member.display_name}</Text>
            <Text style={styles.cardEmail}>{member.email}</Text>
          </View>
          {renderStatusBadge(member.department_verification_status)}
        </View>

        {/* The ONE department this staff selected — shown explicitly */}
        <View style={styles.departmentRow}>
          <Ionicons name="briefcase-outline" size={16} color={colors.secondary} />
          <Text style={styles.departmentLabel}>Department:</Text>
          <Text style={styles.departmentValue}>{deptLabel}</Text>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <Button
              title="Approve"
              variant="primary"
              onPress={() => handleVerify(member, true)}
              style={styles.actionButton}
            />
            <Button
              title="Reject"
              variant="destructive"
              onPress={() => handleVerify(member, false)}
              style={styles.actionButton}
            />
          </View>
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
        <Text style={styles.title}>Verify Staff</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Single-department scope notice */}
      <View style={styles.scopeBanner}>
        <Ionicons name="information-circle" size={18} color={colors.info} />
        <Text style={styles.scopeText}>
          Each staff member is verified for the ONE department they registered under.
          Approval confirms membership in that department only — it grants no other
          department, Head Organizer, or Marketplace access.
        </Text>
      </View>

      {/* Status filter tabs */}
      <View style={styles.filterTabs}>
        {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map(label => {
          const labelText = label === 'all' ? 'All' : label.charAt(0).toUpperCase() + label.slice(1);
          return (
            <TouchableOpacity
              key={label}
              style={[styles.filterTab, statusFilter === label && styles.filterTabActive]}
              onPress={() => setStatusFilter(label)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, statusFilter === label && styles.filterTabTextActive]}>
                {labelText}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Department filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContainer}
      >
        <TouchableOpacity
          style={[styles.chip, departmentFilter === 'all' && styles.chipActive]}
          onPress={() => setDepartmentFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, departmentFilter === 'all' && styles.chipTextActive]}>
            All Departments
          </Text>
        </TouchableOpacity>
        {STAFF_DEPARTMENTS.map(dept => (
          <TouchableOpacity
            key={dept}
            style={[styles.chip, departmentFilter === dept && styles.chipActive]}
            onPress={() => setDepartmentFilter(dept)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, departmentFilter === dept && styles.chipTextActive]}>
              {DEPARTMENT_LABELS[dept]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading staff...</Text>
        </View>
      ) : filteredStaff.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={colors.textDisabled} />
          <Text style={styles.emptyStateTitle}>No Staff Found</Text>
          <Text style={styles.emptyStateText}>
            {statusFilter === 'pending'
              ? 'There are no staff accounts awaiting department verification.'
              : 'No staff accounts match this filter.'}
          </Text>
        </View>
      ) : departmentFilter !== 'all' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredStaff.map(renderStaffCard)}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {groupedByDepartment.map(group => (
            <View key={group.department} style={styles.departmentGroup}>
              <View style={styles.departmentHeader}>
                <Ionicons name="briefcase-outline" size={16} color={colors.secondary} />
                <Text style={styles.departmentHeaderText}>
                  {DEPARTMENT_LABELS[group.department]}
                </Text>
                <Text style={styles.departmentCount}>{group.members.length}</Text>
              </View>
              {group.members.map(renderStaffCard)}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Rejection Reason Modal */}
      <RejectionReasonModal
        visible={showRejectionModal}
        applicantName={staffToReject?.display_name || ''}
        onCancel={handleRejectCancel}
        onSubmit={handleRejectSubmit}
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
  scopeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  scopeText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
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
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  filterTabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.backgroundLight,
    fontWeight: '700',
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  chipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.backgroundLight,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  departmentGroup: {
    marginBottom: spacing.lg,
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  departmentHeaderText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  departmentCount: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
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
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  departmentLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  departmentValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: spacing.sm,
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
});