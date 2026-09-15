import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';

export const EventsScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
