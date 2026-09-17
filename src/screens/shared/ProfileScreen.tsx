import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser, DemoPersona } from '../../contexts/UserContext';
import { Button } from '../../components';

export const ProfileScreen: React.FC = () => {
  const { user, logout, resetOnboarding, applyDemoPersona, updateVerification } = useUser();

  const initials = (user?.display_name ?? 'U')
    .split(' ')
    .map(s => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const personaChips: { key: DemoPersona; label: string }[] = [
    { key: 'cosplayer', label: 'Cosplayer only' },
    { key: 'organizer', label: 'Organizer only' },
    { key: 'both', label: 'Both roles' },
    { key: 'holder-verified', label: 'Verified Holder' },
    { key: 'organizer-head', label: 'Organizer (Head)' },
    { key: 'organizer-staff', label: 'Organizer (Staff)' },
  ];

  const isActivePersona = (key: DemoPersona): boolean => {
    if (key === 'holder-verified') {
      return user?.is_holder_verified === true;
    }
    if (key === 'organizer-head') {
      return user?.is_organizer === true && user?.organizer_role === 'head';
    }
    if (key === 'organizer-staff') {
      return user?.is_organizer === true && user?.organizer_role === 'staff';
    }
    const cos = user?.is_cosplayer === true;
    const org = user?.is_organizer === true;
    if (key === 'cosplayer') return cos && !org;
    if (key === 'organizer') return org && !cos && !user?.organizer_role;
    return cos && org;
  };

  const handlePersonaChange = async (persona: DemoPersona) => {
    // For holder-verified, use updateVerification to persist across logout/login
    if (persona === 'holder-verified') {
      await updateVerification(true, 'verified');
    } else {
      // For role changes, use applyDemoPersona (in-memory only, for demo purposes)
      applyDemoPersona(persona);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'This will log you out and return you to the login screen. Your account will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ],
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will DELETE ALL ACCOUNTS and return you to the Welcome screen. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: resetOnboarding },
      ],
    );
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
              Staff — {user?.organizer_department || 'General'}
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

      {/* Organizer Access — ORGANIZER ONLY (split from Marketplace Verification) */}
      {user?.is_organizer && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Organizer Access</Text>
          <View style={styles.detailRow}>
            <Ionicons name="shield-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[
              styles.detailValue,
              user?.organizer_access_status === 'approved' && { color: colors.success },
              user?.organizer_access_status === 'pending' && { color: colors.warning },
              user?.organizer_access_status === 'rejected' && { color: colors.error },
            ]}>
              {user?.organizer_access_status
                ? user.organizer_access_status.charAt(0).toUpperCase() + user.organizer_access_status.slice(1)
                : 'Pending'}
            </Text>
          </View>
          <Text style={styles.cardNote}>
            {user?.organizer_access_status === 'approved'
              ? 'You have access to create and manage events.'
              : user?.organizer_access_status === 'rejected'
              ? 'Your access request was not approved. Contact support for more info.'
              : 'Your access request is being reviewed by our team.'}
          </Text>
        </View>
      )}

      {/* Marketplace Verification — ALL USERS (split from Organizer Access) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Marketplace Verification</Text>
        <View style={styles.detailRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Holder Status</Text>
          <Text style={[
            styles.detailValue,
            user?.verification_status === 'verified' && { color: colors.success },
            user?.verification_status === 'pending' && { color: colors.warning },
            (user?.verification_status === 'rejected' || user?.verification_status === 'revoked') && { color: colors.error },
          ]}>
            {user?.verification_status
              ? user.verification_status.charAt(0).toUpperCase() + user.verification_status.slice(1)
              : 'Pending'}
          </Text>
        </View>
        <Text style={styles.cardNote}>
          {user?.verification_status === 'verified'
            ? 'You can list items for sale and trade in the marketplace.'
            : 'Verification required to sell or trade items.'}
        </Text>
      </View>

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
              <TouchableOpacity style={styles.manageButton}>
                <Text style={styles.manageButtonText}>Manage Staff</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardNote}>
              Invite staff members to help organize your events. Assign them to departments and track their tasks.
            </Text>
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

      {user?.is_organizer && user?.organizer_role === 'staff' && (
        <>
          {/* Staff Assignment Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assignment</Text>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Invited by</Text>
              <Text style={styles.detailValue}>{user?.organizer_head_name || 'Unknown'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Event</Text>
              <Text style={styles.detailValue}>{user?.organizer_event_name || 'Unassigned'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>{user?.organizer_department || 'General'}</Text>
            </View>
          </View>

          {/* Logistics Preview (Department-scoped) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Logistics — {user?.organizer_department || 'Your Department'}</Text>
            <Text style={styles.cardNote}>
              Track tasks and logistics specific to your department.
            </Text>
            <View style={styles.logisticsRow}>
              <View style={styles.logisticsStat}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.logisticsLabel}>Tasks</Text>
                <Text style={styles.logisticsValue}>—</Text>
              </View>
              <View style={styles.logisticsStat}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.logisticsLabel}>Due Soon</Text>
                <Text style={styles.logisticsValue}>—</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Test Mode — dev only */}
      {__DEV__ && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Test Mode — dev only</Text>
          <Text style={styles.testNote}>
            Not real authentication. Instantly preview each role context to check what it sees.
          </Text>
          <View style={styles.personaRow}>
            {personaChips.map(({ key, label }) => {
              const active = isActivePersona(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.personaChip, active && styles.personaChipActive]}
                  onPress={() => handlePersonaChange(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.personaChipText, active && styles.personaChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.testHint}>
            {user?.is_holder_verified
              ? 'Holder-verified is PERSISTED — survives logout/login. Role switches are in-memory only for demo.'
              : 'Tap "Verified Holder" to persist verification status across logout/login. Role switches are in-memory only.'}
          </Text>
        </View>
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
          <Button
            title="Reset Onboarding (Delete All Accounts)"
            variant="destructive"
            onPress={handleResetOnboarding}
            fullWidth
          />
        )}
      </View>
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
  logoutWrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxxl,
    gap: spacing.sm,
  },
});
