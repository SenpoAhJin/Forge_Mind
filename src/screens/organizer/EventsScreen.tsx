import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';

export const EventsScreen: React.FC = () => {
  const { user } = useUser();
  const isStaff = user?.organizer_role === 'staff';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Staff permission notice */}
      {isStaff && (
        <View style={styles.permissionBanner}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <Text style={styles.permissionText}>
            As a Staff Member, you can view events you're assigned to. Creating and editing events requires Head Organizer permissions.
          </Text>
        </View>
      )}

      <View style={styles.heroCard}>
        <Ionicons name="calendar-outline" size={48} color={colors.secondary} />
        <Text style={styles.heroTitle}>Events</Text>
        <Text style={styles.heroSub}>
          Create and manage cosplay events, track attendance and readiness.
        </Text>
      </View>

      <View style={styles.featureList}>
        <View style={styles.featureRow}>
          <Ionicons name="add-circle-outline" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>Create events with venue and date details</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="people-outline" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>View aggregate cosplayer readiness data</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="trophy-outline" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>Suggest contest tiers based on skill levels</Text>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color={colors.info} />
        <Text style={styles.infoText}>
          Event creation, logistics and meetup planning will be built in FE-7.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heroCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.xl,
  },
  heroTitle: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
  heroSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  permissionText: { ...typography.body, color: colors.textPrimary, flex: 1, lineHeight: 20 },
  featureList: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF5FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: { ...typography.caption, color: colors.info, flex: 1, lineHeight: 18 },
});
