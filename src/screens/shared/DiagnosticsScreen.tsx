/**
 * Diagnostics Screen - Debug and reset data
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button } from '../../components';
import { colors, typography, spacing } from '../../theme';
import { clearAllData, logAllData, checkKey } from '../../utils/diagnostics';
import { useEvents } from '../../contexts/EventsContext';

export const DiagnosticsScreen: React.FC = () => {
  const { events } = useEvents();
  const [output, setOutput] = useState<string>('');

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'This will reset all data to seed values. The app will need to be reloaded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            setOutput('Data cleared. Please reload the app.');
          },
        },
      ]
    );
  };

  const handleLogAll = async () => {
    await logAllData();
    setOutput('Check console for data dump');
  };

  const handleCheckEvents = async () => {
    const data = await checkKey('@ForgeMind:Events');
    setOutput(JSON.stringify(data, null, 2));
  };

  const handleCheckProjects = async () => {
    const data = await checkKey('@ForgeMind:Projects');
    setOutput(JSON.stringify(data, null, 2));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Diagnostics</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Events Context</Text>
        <Text style={styles.dataText}>
          {events.map(e => `${e.id}: ${e.name} (${e.status})`).join('\n')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <Button title="Log All Data to Console" onPress={handleLogAll} variant="secondary" />
        <Button title="Check Events Storage" onPress={handleCheckEvents} variant="secondary" />
        <Button title="Check Projects Storage" onPress={handleCheckProjects} variant="secondary" />
        <Button title="Clear All Data" onPress={handleClearAll} variant="danger" />
      </View>

      {output && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Output</Text>
          <ScrollView style={styles.outputScroll}>
            <Text style={styles.outputText}>{output}</Text>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dataText: {
    ...typography.body,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  outputScroll: {
    maxHeight: 300,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
  },
  outputText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 11,
  },
});
