/**
 * ServerStatusBanner
 *
 * A slim, dismiss-free banner shown while the backend cannot be reached. It
 * listens to the shared serverStatus module, so every request helper keeps it
 * in sync automatically. No navigation, no state of its own beyond the
 * reachability flag.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '../theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { subscribeServerStatus, isServerReachable } from '../services/serverStatus';

const getDynamicStyles = (themeColors: ThemeColors) => ({
  banner: {
    backgroundColor: themeColors.error,
  },
  text: {
    color: themeColors.background,
  },
});

export const ServerStatusBanner: React.FC = () => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  const [reachable, setReachable] = useState(isServerReachable);

  useEffect(() => {
    // Sync again in case a fetch finished between first render and subscribe.
    setReachable(isServerReachable());
    const unsubscribe = subscribeServerStatus(setReachable);
    return unsubscribe;
  }, []);

  if (reachable) return null;

  return (
    <View style={[styles.banner, dynamicStyles.banner]}>
      <Ionicons name="cloud-offline-outline" size={16} color={dynamicStyles.text.color} />
      <Text style={[styles.text, dynamicStyles.text]}>Can&apos;t reach the server.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
});