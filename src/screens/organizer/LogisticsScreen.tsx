import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';

export const LogisticsScreen: React.FC = () => {
  const { user } = useUser();
  const isStaff = user?.organizer_role === 'staff';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Staff permission notice */}
      {isStaff && (
        <View style={styles.permissionBanner}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <Text style={styles.permissionText}>
            As a Staff Member, you can only view and edit logistics data for your assigned department.
          </Text>
        </View>
      )}

      <View style={styles.heroCard}>
        <Ionicons name="car-outline" size={48} color={colors.secondary} />
        <Text style={styles.heroTitle}>Logistics</Text>
        <Text style={styles.heroSub}>
          Track guest, sponsor and performer arrival details in one place.
        </Text>
      </View>

      <View style={styles.featureList}>
        <View style={styles.featureRow}>
          <Ionicons name="people-circle-outline" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>Manage guest arrival times and parking</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="document-text-outline" size={20} color={colors.secondary} />
          <Text style={styles.featureText}>Track field completion per participant</Text>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color={colors.info} />
        <Text style={styles.infoText}>
          Logistics tracker and participant management will be built in FE-7.
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
