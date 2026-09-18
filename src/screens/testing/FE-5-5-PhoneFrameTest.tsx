/**
 * FE-5.5 Phone Frame Test
 * Test RequestOrganizerAccessScreen and HolderReviewQueueScreen at 3 device sizes
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import RequestOrganizerAccessScreen from '../organizer/RequestOrganizerAccessScreen';
import HolderReviewQueueScreen from '../holder/HolderReviewQueueScreen';
import { colors, spacing } from '../../theme';

type DeviceSize = 'small' | 'standard' | 'large';
type ScreenType = 'request' | 'review';

const DEVICE_WIDTHS = {
  small: 375,    // iPhone SE
  standard: 393, // iPhone 14
  large: 412,    // Large Android
};

export default function FE55PhoneFrameTest() {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('standard');
  const [screen, setScreen] = useState<ScreenType>('request');

  const mockNavigation = {
    navigate: (route: string) => console.log('Navigate to:', route),
    goBack: () => console.log('Go back'),
    getParent: () => ({ navigate: (route: string) => console.log('Parent navigate:', route) }),
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Text style={styles.title}>FE-5.5 Phone Frame Test</Text>
        
        <View style={styles.controlGroup}>
          <Text style={styles.label}>Device Size:</Text>
          <View style={styles.buttonRow}>
            {(['small', 'standard', 'large'] as DeviceSize[]).map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.button, deviceSize === size && styles.buttonActive]}
                onPress={() => setDeviceSize(size)}
              >
                <Text style={[styles.buttonText, deviceSize === size && styles.buttonTextActive]}>
                  {size === 'small' ? 'SE (375)' : size === 'standard' ? '14 (393)' : 'XL (412)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.label}>Screen:</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, screen === 'request' && styles.buttonActive]}
              onPress={() => setScreen('request')}
            >
              <Text style={[styles.buttonText, screen === 'request' && styles.buttonTextActive]}>
                Request Access
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, screen === 'review' && styles.buttonActive]}
              onPress={() => setScreen('review')}
            >
              <Text style={[styles.buttonText, screen === 'review' && styles.buttonTextActive]}>
                Holder Review
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.preview} contentContainerStyle={styles.previewContent}>
        <Text style={styles.deviceLabel}>
          Testing at {deviceSize === 'small' ? 'iPhone SE' : deviceSize === 'standard' ? 'iPhone 14' : 'Large Android'} width ({DEVICE_WIDTHS[deviceSize]}px)
        </Text>
        <View style={{ width: DEVICE_WIDTHS[deviceSize] }}>
          {screen === 'request' ? (
            <RequestOrganizerAccessScreen navigation={mockNavigation} />
          ) : (
            <HolderReviewQueueScreen navigation={mockNavigation} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  controls: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  controlGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  buttonTextActive: {
    color: '#fff',
  },
  deviceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  preview: {
    flex: 1,
  },
  previewContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
});
