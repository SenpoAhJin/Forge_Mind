/**
 * ForgeMind - Voice Entry (FE-5)
 * Mock recording UI (mic button, recording indicator) with a language toggle.
 * Transcription is MOCKED — real speech-to-text is a BE-1 backend feature.
 * Maps to OwnedAttire original_input_text / entry_language / entry_method='voice'.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, ConditionSlider } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { EntryLanguage } from '../../types/owned-attire';
import { mockTranscription, mockCategorizationFromText } from '../../utils/mockCatalog';

interface VoiceEntryScreenProps {
  onContinue: (input: {
    entry_method: 'voice';
    entry_language: EntryLanguage;
    original_input_text: string;
    auto_categorized_type: string;
    auto_categorized_color: string;
    auto_categorized_style: string;
    condition_rating: number;
  }) => void;
}

type LanguageOption = { key: EntryLanguage; label: string };

const LANGUAGES: LanguageOption[] = [
  { key: 'english', label: 'English' },
  { key: 'taglish', label: 'Taglish' },
];

function usePulse() {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

const formatSeconds = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

export const VoiceEntryScreen: React.FC<VoiceEntryScreenProps> = ({ onContinue }) => {
  const [language, setLanguage] = useState<EntryLanguage>('english');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [conditionRating, setConditionRating] = useState(3);

  const pulse = usePulse();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = () => {
    setTranscription(null);
    setElapsed(0);
    setIsRecording(true);
    timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTranscribing(true);
    setTimeout(() => {
      const transcript = mockTranscription(language);
      setTranscription(transcript);
      setIsTranscribing(false);
    }, 1200);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleContinue = () => {
    if (!transcription) return;
    const trimmed = transcription.trim();
    onContinue({
      entry_method: 'voice',
      entry_language: language,
      original_input_text: trimmed,
      ...mockCategorizationFromText(trimmed),
      condition_rating: conditionRating,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Voice Entry</Text>
      <Text style={styles.subtitle}>Describe the item out loud. Transcription is mocked for now.</Text>

      <View style={styles.langRow}>
        <Text style={styles.langLabel}>Language</Text>
        <View style={styles.segmented}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.key}
              style={[styles.segment, language === lang.key && styles.segmentActive]}
              activeOpacity={0.7}
              onPress={() => setLanguage(lang.key)}
            >
              <Text style={[styles.segmentText, language === lang.key && styles.segmentTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.recorder}>
        {isRecording && (
          <Animated.View style={[styles.pulseRing, { opacity: pulse }]} />
        )}
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonRecording]}
          activeOpacity={0.8}
          onPress={toggleRecording}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={34}
            color={colors.backgroundLight}
          />
        </TouchableOpacity>

        {isRecording && (
          <View style={styles.recordingStatus}>
            <View style={styles.recDot} />
            <Text style={styles.recordingTime}>{formatSeconds(elapsed)}</Text>
          </View>
        )}
        {!isRecording && !transcription && !isTranscribing && (
          <Text style={styles.recorderHint}>Tap the mic to start recording, tap again to stop</Text>
        )}
      </View>

      {isTranscribing && (
        <View style={styles.transcribeRow}>
          <ActivityIndicator size="small" color={colors.tertiary} />
          <Text style={styles.transcribeText}>Transcribing…</Text>
        </View>
      )}

      {transcription && !isTranscribing && (
        <View style={styles.transcriptCard}>
          <Text style={styles.transcriptLabel}>Transcribed (mock)</Text>
          <Text style={styles.transcriptText}>“{transcription}”</Text>
          <Text style={styles.transcriptHint}>
            Keyword type/color extraction ran as a mock — editable on the next screen.
          </Text>
        </View>
      )}

      {transcription && !isTranscribing && (
        <>
          <ConditionSlider value={conditionRating} onValueChange={setConditionRating} label="Condition" />
          <Button title="Continue to Confirmation" variant="primary" fullWidth onPress={handleContinue} />
        </>
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
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  langLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.backgroundLight,
  },
  recorder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    minHeight: 180,
  },
  pulseRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.tertiary,
  },
  micButton: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.full,
    backgroundColor: colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  micButtonRecording: {
    backgroundColor: colors.error,
  },
  recorderHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  recordingTime: {
    ...typography.h3,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  transcribeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  transcribeText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  transcriptCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  transcriptLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  transcriptText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  transcriptHint: {
    ...typography.caption,
    color: colors.tertiary,
    marginTop: spacing.md,
  },
});