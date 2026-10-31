/**
 * WEAR-2 Step 2: About the 3D Preview Screen
 * 
 * Explainer screen for what the 3D preview shows and doesn't show.
 * Content exactly as specified in the deck.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SHOWN_IN_3D_SLOTS, NOT_SHOWN_YET_SLOTS } from '../../constants/slots';

interface About3DPreviewScreenProps {
  navigation?: any;
}

export default function About3DPreviewScreen({ navigation }: About3DPreviewScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="cube-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>About the 3D preview</Text>
      </View>
      
      {/* Shown in 3D */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text style={styles.cardTitle}>Shown in 3D</Text>
        </View>
        <Text style={styles.cardBody}>
          {SHOWN_IN_3D_SLOTS.join(', ')}
        </Text>
      </View>
      
      {/* Not shown yet */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="time-outline" size={24} color={colors.warning} />
          <Text style={styles.cardTitle}>Not shown yet</Text>
        </View>
        <Text style={styles.cardBody}>
          {NOT_SHOWN_YET_SLOTS.join(', ')}
        </Text>
      </View>
      
      {/* Shapes note */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle-outline" size={24} color={colors.info} />
          <Text style={styles.cardTitle}>What you see</Text>
        </View>
        <Text style={styles.cardBody}>
          Pieces are simple colored shapes, not exact replicas.
        </Text>
      </View>
      
      {/* Callout */}
      <View style={styles.callout}>
        <Ionicons name="checkmark-done-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.calloutText}>
          The checklist and budget still count every item, even the ones not shown in 3D.
        </Text>
      </View>
      
      {/* WEAR-2: Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          3D pieces are simple colored shapes, not exact replicas of your items.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  cardBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  calloutText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 22,
  },
  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
