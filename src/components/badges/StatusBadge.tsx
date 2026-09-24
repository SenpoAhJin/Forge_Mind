/**
 * ForgeMind Design System - Status Badge Component
 * Circular or pill-shaped, semantic color, 8px diameter dot + status text
 * Used for: Project status, listing status, event status, verification status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, spacing } from '../../theme';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';

type BadgeStatus = 'active' | 'pending' | 'completed' | 'blocked' | 'cancelled' | 'verified' | 'rejected';

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const { themeColors } = useTheme();
  
  const getStatusColor = (status: BadgeStatus) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'verified':
        return themeColors.success;
      case 'pending':
        return themeColors.warning;
      case 'blocked':
      case 'cancelled':
      case 'rejected':
        return themeColors.error;
      default:
        return themeColors.textSecondary;
    }
  };

  const getStatusLabel = (status: BadgeStatus) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const statusColor = getStatusColor(status);
  const displayLabel = label || getStatusLabel(status);

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Text style={[styles.label, { color: statusColor }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
