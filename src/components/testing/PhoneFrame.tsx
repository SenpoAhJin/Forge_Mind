import React, { useState } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';

type DeviceType = 'iphone14' | 'iphone15' | 'pixel7' | 'galaxys21';

interface PhoneFrameProps {
  children: React.ReactNode;
}

const DEVICE_SPECS = {
  iphone14: {
    width: 393,
    height: 852,
    notchHeight: 47,
    name: 'iPhone 14 Pro',
  },
  iphone15: {
    width: 393,
    height: 852,
    notchHeight: 47,
    name: 'iPhone 15 Pro',
  },
  pixel7: {
    width: 412,
    height: 915,
    notchHeight: 32,
    name: 'Pixel 7',
  },
  galaxys21: {
    width: 360,
    height: 800,
    notchHeight: 30,
    name: 'Galaxy S21',
  },
};

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  const [device] = useState<DeviceType>('iphone14');

  // Only show frame on web
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const spec = DEVICE_SPECS[device];
  const screenDimensions = Dimensions.get('window');
  
  // Calculate scale to fit screen with padding
  const maxWidth = screenDimensions.width - 100;
  const maxHeight = screenDimensions.height - 100;
  const scale = Math.min(1, maxWidth / spec.width, maxHeight / spec.height);

  return (
    <View style={styles.container}>
      {/* Phone frame */}
      <View style={[
        styles.phoneFrame,
        {
          width: spec.width,
          height: spec.height,
          transform: [{ scale }],
        }
      ]}>
        {/* Status bar / notch area */}
        <View style={[styles.notch, { height: spec.notchHeight }]}>
          <View style={styles.notchCutout} />
        </View>
        
        {/* App content */}
        <View style={styles.appContent}>
          {children}
        </View>

        {/* Home indicator (iPhone style) */}
        <View style={styles.homeIndicator} />
      </View>

      {/* Device selector removed for now - can be added later */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    backgroundColor: '#000',
    borderRadius: 40,
    overflow: 'hidden',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
    // Border to simulate phone bezel
    borderWidth: 12,
    borderColor: '#2a2a2a',
  },
  notch: {
    backgroundColor: '#000',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notchCutout: {
    width: 120,
    height: 30,
    backgroundColor: '#000',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginTop: -5,
  },
  appContent: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'scroll',
  },
  homeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: '#fff',
    borderRadius: 100,
    alignSelf: 'center',
    marginBottom: 8,
    opacity: 0.5,
  },
});
