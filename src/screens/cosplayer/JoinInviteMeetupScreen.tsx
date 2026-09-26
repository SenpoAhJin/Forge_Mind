/**
 * Join Invite Meetup Screen
 * Two ways to join: enter code manually OR scan QR
 * Camera scanning not available on web (falls back to manual entry)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { StandardCard, Button, TextInputField, ConfirmationModal } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useInviteMeetups } from '../../contexts/InviteMeetupsContext';
import { useUser } from '../../contexts/UserContext';

interface JoinInviteMeetupScreenProps {
  navigation: any;
}

export const JoinInviteMeetupScreen: React.FC<JoinInviteMeetupScreenProps> = ({ navigation }) => {
  const { joinMeetup, getMeetupByCode } = useInviteMeetups();
  const { user } = useUser();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [joining, setJoining] = useState(false);

  // Camera scanning state
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Web doesn't support camera reliably
  const cameraSupported = Platform.OS !== 'web';

  const handleJoin = async (inviteCode: string) => {
    if (!user) {
      setCodeError('You must be signed in');
      return;
    }

    const trimmedCode = inviteCode.trim().toUpperCase();
    if (!trimmedCode) {
      setCodeError('Enter an invite code');
      return;
    }

    // Check if meetup exists first
    const meetup = getMeetupByCode(trimmedCode);
    if (!meetup) {
      setCodeError('Invalid invite code');
      return;
    }

    setJoining(true);
    const result = await joinMeetup(trimmedCode, user.email, user.display_name);
    setJoining(false);

    if (result.success) {
      // Navigate to the meetup detail
      navigation.navigate('InviteMeetupDetail', { meetupId: meetup.id });
    } else {
      setCodeError(result.error || 'Failed to join meetup');
    }
  };

  const handleManualJoin = () => {
    handleJoin(code);
  };

  const handleScanPress = async () => {
    if (!cameraSupported) {
      setCodeError('Camera scanning not available on web. Please enter code manually.');
      return;
    }

    // Check/request permission
    if (!permission) {
      // Still loading
      return;
    }

    if (!permission.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        setShowPermissionModal(true);
        return;
      }
    }

    // Permission granted, show scanner
    setScanned(false);
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    setShowScanner(false);
    
    // Use the scanned code to join
    handleJoin(data);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Manual entry */}
        <StandardCard style={styles.card}>
          <Text style={styles.sectionTitle}>Enter Invite Code</Text>
          <Text style={styles.sectionDescription}>
            Type the code shared by your friend
          </Text>

          <TextInputField
            label="Invite Code"
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              if (codeError) setCodeError('');
            }}
            placeholder="E.g., ABC123"
            autoCapitalize="characters"
            error={codeError}
          />

          <Button
            title={joining ? 'Joining...' : 'Join Meetup'}
            onPress={handleManualJoin}
            variant="primary"
            fullWidth
            disabled={joining}
          />
        </StandardCard>

        {/* Scanner option */}
        {cameraSupported ? (
          <StandardCard style={styles.card}>
            <Text style={styles.sectionTitle}>Or Scan QR Code</Text>
            <Text style={styles.sectionDescription}>
              Scan your friend's QR code to join instantly
            </Text>

            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanPress}
              activeOpacity={0.7}
            >
              <Ionicons name="qr-code" size={48} color={colors.primary} />
              <Text style={styles.scanButtonText}>Open Scanner</Text>
            </TouchableOpacity>
          </StandardCard>
        ) : (
          <StandardCard style={styles.card}>
            <View style={styles.webNotice}>
              <Ionicons name="information-circle" size={24} color={colors.warning} />
              <Text style={styles.webNoticeText}>
                QR scanning not available in web browser. Use manual code entry or scan from mobile device.
              </Text>
            </View>
          </StandardCard>
        )}
      </View>

      {/* Camera Scanner Modal */}
      {showScanner && (
        <Modal
          visible={showScanner}
          animationType="slide"
          onRequestClose={() => setShowScanner(false)}
        >
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerHeader}>
                  <Text style={styles.scannerTitle}>Scan Invite QR Code</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowScanner(false)}
                  >
                    <Ionicons name="close" size={32} color={colors.backgroundLight} />
                  </TouchableOpacity>
                </View>

                <View style={styles.scannerFrame}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>

                <Text style={styles.scannerInstruction}>
                  Position QR code within frame
                </Text>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}

      {/* Permission denied modal */}
      <ConfirmationModal
        visible={showPermissionModal}
        title="Camera Permission Required"
        message="To scan QR codes, allow camera access in your device settings. You can still join by entering the code manually."
        confirmText="OK"
        onConfirm={() => setShowPermissionModal(false)}
        onCancel={() => setShowPermissionModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  scanButton: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  scanButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  webNoticeText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: colors.textPrimary,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerTitle: {
    ...typography.h2,
    color: colors.backgroundLight,
  },
  closeButton: {
    padding: spacing.sm,
  },
  scannerFrame: {
    alignSelf: 'center',
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scannerInstruction: {
    ...typography.body,
    color: colors.backgroundLight,
    textAlign: 'center',
  },
});
