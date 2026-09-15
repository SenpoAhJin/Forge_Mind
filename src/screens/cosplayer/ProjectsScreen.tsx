import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';

export const ProjectsScreen: React.FC = () => {
  const { user } = useUser();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.display_name ?? 'Cosplayer'}</Text>
      </View>

      <View style={styles.heroCard}>
        <Ionicons name="folder-open-outline" size={48} color={colors.primary} />
        <Text style={styles.heroTitle}>Your Projects</Text>
        <Text style={styles.heroSub}>
          Track your cosplay builds from planning to completion.
        </Text>
      </View>

      <View style={styles.emptyState}>
        <Ionicons name="add-circle-outline" size={36} color={colors.textDisabled} />
        <Text style={styles.emptyTitle}>No projects yet</Text>
        <Text style={styles.emptySub}>
          Browse characters and start your first cosplay project.
        </Text>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color={colors.info} />
        <Text style={styles.infoText}>
          Project creation, task tracking and 3D preview will be available in FE-4.
        </Text>
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
  greeting: {
    marginBottom: spacing.xl,
  },
  greetingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  nameText: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
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
  heroTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  heroSub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF5FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
  },
});
