/**
 * CrossPlatformImage Component
 * Handles image URIs consistently across Expo Go, iOS, Android, and Web platforms
 */

import React from 'react';
import { Image, ImageProps, Platform, ImageSourcePropType } from 'react-native';

interface CrossPlatformImageProps extends Omit<ImageProps, 'source'> {
  uri: string | null | undefined;
  fallbackIcon?: React.ReactNode;
}

/**
 * Normalizes image URI for cross-platform compatibility
 * - Data URIs (data:image/...) work on all platforms
 * - HTTP/HTTPS URLs work on all platforms
 * - Blob URLs work on native but may have issues on web
 * - File paths need platform-specific handling
 */
const normalizeImageUri = (uri: string | null | undefined, platform: string): ImageSourcePropType | null => {
  if (!uri) return null;

  // Data URIs work everywhere
  if (uri.startsWith('data:image/') || uri.startsWith('data:application/octet-stream')) {
    return { uri };
  }

  // HTTP/HTTPS URLs work everywhere
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return { uri };
  }

  // Blob URLs - work on native, may have persistence issues
  if (uri.startsWith('blob:')) {
    if (platform === 'web') {
      console.warn('[CrossPlatformImage] Blob URL on web - may not persist across refreshes:', uri.substring(0, 50));
    }
    return { uri };
  }

  // File paths or other URIs
  if (platform === 'web') {
    // On web, try to use as-is (may be a relative URL or server path)
    return { uri };
  } else {
    // On native, use file:// protocol if not present
    if (!uri.startsWith('file://')) {
      return { uri: `file://${uri}` };
    }
    return { uri };
  }
};

export const CrossPlatformImage: React.FC<CrossPlatformImageProps> = ({
  uri,
  fallbackIcon,
  onError,
  onLoad,
  ...imageProps
}) => {
  const [hasError, setHasError] = React.useState(false);
  const imageSource = normalizeImageUri(uri, Platform.OS);

  // Debug logging
  React.useEffect(() => {
    if (uri && __DEV__) {
      console.log('[CrossPlatformImage] Loading image:', {
        platform: Platform.OS,
        uri_preview: uri.substring(0, 80),
        uri_type: uri.startsWith('data:') ? 'data-uri' : 
                   uri.startsWith('http') ? 'http' : 
                   uri.startsWith('blob:') ? 'blob' : 
                   uri.startsWith('file://') ? 'file' : 'unknown',
        has_source: !!imageSource,
      });
    }
  }, [uri]);

  const handleError = (error: any) => {
    console.error('[CrossPlatformImage] Load error:', {
      uri: uri?.substring(0, 80),
      platform: Platform.OS,
      error: error?.nativeEvent,
    });
    setHasError(true);
    onError?.(error);
  };

  const handleLoad = (event: any) => {
    if (__DEV__) {
      console.log('[CrossPlatformImage] ✅ Load success:', uri?.substring(0, 50));
    }
    setHasError(false);
    onLoad?.(event);
  };

  // Show fallback if no valid source or error occurred
  if (!imageSource || hasError) {
    return <>{fallbackIcon || null}</>;
  }

  return (
    <Image
      {...imageProps}
      source={imageSource}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

// Helper function to check if URI is valid
export const isValidImageUri = (uri: string | null | undefined): boolean => {
  if (!uri || typeof uri !== 'string') return false;
  
  return (
    uri.startsWith('data:image/') ||
    uri.startsWith('data:application/octet-stream') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('blob:') ||
    uri.startsWith('file://') ||
    uri.length > 10 // Assume any other string might be a valid path
  );
};

export default CrossPlatformImage;
