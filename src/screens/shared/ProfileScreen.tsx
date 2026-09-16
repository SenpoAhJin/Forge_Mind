import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser, DemoPersona } from '../../contexts/UserContext';
import { Button } from '../../components';

export const ProfileScreen: React.FC = () => {
  const { user, resetOnboarding, applyDemoPersona } = useUser();

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
  ];

  const isActivePersona = (key: DemoPersona): boolean => {
    if (key === 'holder-verified') {
      return user?.is_holder_verified === true;
    }
    const cos = user?.is_cosplayer === true;
    const org = user?.is_organizer === true;
    if (key === 'cosplayer') return cos && !org;
    if (key === 'organizer') return org && !cos;
    return cos && org;
  };

  const handleLogout = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will return you to the Welcome screen. All demo data will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetOnboarding },
      ],
    );
  };

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
        {user?.is_organizer && (
          <View style={[styles.badge, { backgroundColor: '#FFE8EF' }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.secondary} />
            <Text style={[styles.badgeText, { color: colors.secondary }]}>Organizer</Text>
          </View>
        )}
      </View>

      {/* Body info */}
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

      {/* Verification */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verification</Text>
        <View style={styles.detailRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={[styles.detailValue, { color: colors.warning }]}>
            {user?.verification_status
              ? user.verification_status.charAt(0).toUpperCase() + user.verification_status.slice(1)
              : 'Pending'}
          </Text>
        </View>
      </View>

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
                  onPress={() => applyDemoPersona(key)}
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
              ? 'Holder-verified is set. Today it only changes the Verification status above — no other UI reads it yet.'
              : 'Holder-verified currently only reflects on the Verification status above; nothing else in the UI branches on it yet.'}
          </Text>
        </View>
      )}

      {/* App info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Info</Text>
        <View style={styles.detailRow}>
          <Ionicons name="code-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Version</Text>
          <Text style={styles.detailValue}>FE-4 (Projects + Dashboard)</Text>
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
          title="Reset Onboarding"
          variant="destructive"
          onPress={handleLogout}
          fullWidth
        />
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
  cardTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
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
  },
});
