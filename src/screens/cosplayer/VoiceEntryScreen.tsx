/**
 * ForgeMind - Voice Entry (FE-5)
 * Real audio recording with transcription via backend AI service.
 * Web: MediaRecorder API
 * Native: expo-audio v57 recording
 * User ALWAYS confirms/edits transcript before save.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Platform, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, ConditionSlider } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { EntryLanguage } from '../../types/owned-attire';
import { mockCategorizationFromText } from '../../utils/mockCatalog';
import { API_BASE_URL } from '../../config/api';

// Expo Audio v57 imports
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from 'expo-audio';

interface VoiceEntryScreenProps {
  onContinue: (input: {
    entry_method: 'voice';
    entry_language: EntryLanguage;
    original_input_text: string;
    photo_urls: string[];
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
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState('');
  const [conditionRating, setConditionRating] = useState(3);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [transcriptionSource, setTranscriptionSource] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pulse = usePulse();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Native audio recorder (expo-audio v57)
  const audioRecorder = Platform.OS !== 'web' ? useAudioRecorder(RecordingPresets.HIGH_QUALITY) : null;
  const recorderState = Platform.OS !== 'web' && audioRecorder ? useAudioRecorderState(audioRecorder) : null;

  // Request microphone permission on mount
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          // Web: check navigator.mediaDevices
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setPermissionGranted(false);
            setErrorMessage('Your browser does not support audio recording.');
            return;
          }
          // getUserMedia will prompt on first use
          setPermissionGranted(true);
        } else {
          // Native: request expo-audio permission
          const status = await AudioModule.requestRecordingPermissionsAsync();
          setPermissionGranted(status.granted);
          if (status.granted) {
            await setAudioModeAsync({
              playsInSilentMode: true,
              allowsRecording: true,
            });
          } else {
            setErrorMessage('Microphone permission denied. Please enable it in settings or type your entry.');
          }
        }
      } catch (err) {
        console.error('Permission request failed:', err);
        setPermissionGranted(false);
        setErrorMessage('Could not request microphone permission.');
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setTranscription(null);
    setErrorMessage(null);
    setElapsed(0);
    setIsRecording(true);
    timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);

    try {
      if (Platform.OS === 'web') {
        // Web: MediaRecorder API
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const recorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
      } else {
        // Native: expo-audio v57
        if (audioRecorder) {
          await audioRecorder.prepareToRecordAsync();
          audioRecorder.record();
        }
      }
    } catch (err) {
      console.error('Start recording failed:', err);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setErrorMessage('Failed to start recording. Please check microphone permission or type your entry.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      if (Platform.OS === 'web') {
        // Web: stop MediaRecorder and get blob
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          
          // Wait for final data
          await new Promise<void>((resolve) => {
            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.onstop = () => resolve();
            } else {
              resolve();
            }
          });

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await transcribeAudio(audioBlob, 'audio.webm');

          // Stop tracks
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      } else {
        // Native: stop expo-audio recorder
        if (audioRecorder) {
          await audioRecorder.stop();
          const uri = audioRecorder.uri;
          
          if (uri) {
            await transcribeAudioFromUri(uri);
          } else {
            setErrorMessage('Recording failed to save. Please try again or type your entry.');
          }
        }
      }
    } catch (err) {
      console.error('Stop recording failed:', err);
      setErrorMessage('Failed to process recording. Please try again or type your entry.');
    }
  };

  const transcribeAudio = async (audioBlob: Blob, filename: string) => {
    setIsTranscribing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, filename);

      const response = await fetch(`${API_BASE_URL}/api/ai/transcribe`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        // Backend returned error - show message and allow typed fallback
        setErrorMessage(result.message || 'Transcription failed. Please type your entry instead.');
        setIsTranscribing(false);
        return;
      }

      // Success
      setTranscription(result.transcript);
      setEditedTranscription(result.transcript);
      setTranscriptionSource(result.source || 'openai_whisper');
      setIsTranscribing(false);
    } catch (err) {
      console.error('Transcription failed:', err);
      setErrorMessage('Voice transcription is unavailable. Please type your entry instead.');
      setIsTranscribing(false);
    }
  };

  const transcribeAudioFromUri = async (uri: string) => {
    setIsTranscribing(true);
    setErrorMessage(null);

    try {
      // Read file from uri using expo-file-system
      const { uri: audioUri } = await import('expo-file-system').then(FileSystem => 
        FileSystem.getInfoAsync(uri)
      );

      if (!audioUri) {
        setErrorMessage('Could not read recorded audio. Please try again or type your entry.');
        setIsTranscribing(false);
        return;
      }

      // Fetch audio as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Send to backend
      const formData = new FormData();
      formData.append('audio', blob, 'recording.m4a');

      const transcribeResponse = await fetch(`${API_BASE_URL}/api/ai/transcribe`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await transcribeResponse.json();

      if (!transcribeResponse.ok) {
        setErrorMessage(result.message || 'Transcription failed. Please type your entry instead.');
        setIsTranscribing(false);
        return;
      }

      // Success
      setTranscription(result.transcript);
      setEditedTranscription(result.transcript);
      setTranscriptionSource(result.source || 'openai_whisper');
      setIsTranscribing(false);
    } catch (err) {
      console.error('Transcription from URI failed:', err);
      setErrorMessage('Voice transcription is unavailable. Please type your entry instead.');
      setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleEditTranscript = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setTranscription(editedTranscription.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTranscription(transcription || '');
    setIsEditing(false);
  };

  const handleContinue = () => {
    const finalTranscript = isEditing ? editedTranscription.trim() : (transcription || '').trim();
    if (!finalTranscript) return;

    onContinue({
      entry_method: 'voice',
      entry_language: language,
      original_input_text: finalTranscript,
      photo_urls: [],
      ...mockCategorizationFromText(finalTranscript),
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