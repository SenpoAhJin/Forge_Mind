import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ReferenceReviewRepository, validateResult } from '../utils/referenceReviews';
import type { ReferenceResult } from '../types/referenceExtraction';
export const referenceReviews = new ReferenceReviewRepository(AsyncStorage);

export async function extractReference(image: string, signal: AbortSignal, stage: (value: 'sending' | 'analyzing') => void): Promise<ReferenceResult> {
  const base = process.env.EXPO_PUBLIC_EXTRACTION_URL?.replace(/\/$/, '');
  if (!base) throw new Error('Set EXPO_PUBLIC_EXTRACTION_URL to your computer LAN address, then restart Expo.');
  const mime = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(image)?.[1];
  if (!mime) throw new Error('Choose a JPEG, PNG or WebP reference image.');
  const data = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(image, { signal })).blob();
    data.append('image', blob, 'reference');
  } else data.append('image', { uri: image, name: 'reference', type: mime } as any);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const clean = () => signal.removeEventListener('abort', abort);
    xhr.open('POST', `${base}/api/extract-reference`);
    xhr.timeout = 50000;
    xhr.upload.onload = () => stage('analyzing');
    xhr.onerror = () => { clean(); reject(new Error('Cannot reach the local analysis service. Check the LAN address and service.')); };
    xhr.ontimeout = () => { clean(); reject(new Error('Analysis timed out. Retry or enter components manually.')); };
    xhr.onabort = () => { clean(); reject(new Error('Analysis canceled.')); };
    xhr.onload = () => {
      clean();
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300) throw new Error(response.error?.message ?? 'Analysis failed.');
        validateResult(response); resolve(response);
      } catch (error) { reject(error); }
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { clean(); reject(new Error('Analysis canceled.')); return; }
    stage('sending'); xhr.send(data);
  });
}
