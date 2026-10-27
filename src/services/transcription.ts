/**
 * Voice Transcription Service
 * Calls Flask /api/ai/transcribe with fallback to typed entry
 */

const FLASK_URL = process.env.EXPO_PUBLIC_FLASK_URL || 'http://localhost:5000';

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  source: 'ai_transcription' | 'baseline' | 'error';
  language: string;
  message?: string;
  error?: string;
}

export async function transcribeAudio(
  audioUri: string,
  language: 'en' | 'tl' = 'en'
): Promise<TranscriptionResult> {
  try {
    const formData = new FormData();
    
    // @ts-ignore - FormData append file works in React Native
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/wav',
      name: 'recording.wav',
    });
    formData.append('language', language);

    const response = await fetch(`${FLASK_URL}/api/ai/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Transcription error:', error);
    // Fallback to baseline (prompt user to type)
    return {
      transcript: '',
      confidence: 0.0,
      source: 'error',
      language,
      message: 'Voice transcription unavailable. Please type your description.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
