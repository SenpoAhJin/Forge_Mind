import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { OrganizerService } from '../../services/OrganizerService';
import { OrganizerAccessRequest } from '../../types/organizer';
import { Ionicons } from '@expo/vector-icons';

export default function RequestOrganizerAccessScreen({ navigation }: any) {
  const { user } = useUser();
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<OrganizerAccessRequest | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);

  useEffect(() => {
    loadExistingRequest();
  }, []);

  const loadExistingRequest = async () => {
    if (!user?.email) return;
    
    try {
      const request = await OrganizerService.getAccessRequestByUserId(user.email);
      setExistingRequest(request);
    } catch (error) {
      // No existing request is fine
      console.log('No existing request found');
    } finally {
      setLoadingRequest(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'User email not found');
      return;
    }

    if (justification.trim().length < 100) {
      Alert.alert('Justification Too Short', 'Please provide at least 100 characters explaining why you want to become an Event Organizer.');
      return;
    }

    setLoading(true);
    try {
      const result = await OrganizerService.submitAccessRequest(user.email, justification.trim());
      
      if (result.success) {
        // Reload the request to get the full object
        await loadExistingRequest();
        setJustification('');
        Alert.alert('Success', 'Your request has been submitted and will be reviewed by our team.');
      } else {
        Alert.alert('Error', result.error || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundLight,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    header: {
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      borderWidth: 1,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    statusIcon: {
      marginRight: spacing.sm,
    },
    statusTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 16,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    statusMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    statusDate: {
      fontSize: 13,
      color: colors.textDisabled,
      marginTop: spacing.xs,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    hint: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    textArea: {
      backgroundColor: colors.backgroundLight,
      borderRadius: 8,
      padding: spacing.md,
      fontSize: 15,
      color: colors.textPrimary,
      minHeight: 160,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.border,
    },
    charCount: {
      fontSize: 12,
      color: colors.textDisabled,
      textAlign: 'right',
      marginTop: spacing.sm,
    },
    charCountWarning: {
      color: colors.warning,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    submitButtonDisabled: {
      backgroundColor: colors.border,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loadingRequest) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const charCount = justification.length;
  const isValid = charCount >= 100;

  // Existing request view
  if (existingRequest) {
    const isPending = existingRequest.status === 'pending';
    const isApproved = existingRequest.status === 'approved';
    const isRejected = existingRequest.status === 'rejected';

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Organizer Access Request</Text>
          <Text style={styles.subtitle}>
            Your request to become an Event Organizer.
          </Text>
        </View>

        <View
          style={[
            styles.statusCard,
            {
              borderColor: isPending
                ? colors.warning
                : isApproved
                ? colors.success
                : colors.error,
            },
          ]}
        >
          <View style={styles.statusHeader}>
            <Ionicons
              name={
                isPending
                  ? 'time-outline'
                  : isApproved
                  ? 'checkmark-circle-outline'
                  : 'close-circle-outline'
              }
              size={24}
              color={isPending ? colors.warning : isApproved ? colors.success : colors.error}
              style={styles.statusIcon}
            />
            <Text style={styles.statusTitle}>Request Status</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isPending
                    ? `${colors.warning}15`
                    : isApproved
                    ? `${colors.success}15`
                    : `${colors.error}15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: isPending ? colors.warning : isApproved ? colors.success : colors.error,
                  },
                ]}
              >
                {existingRequest.status}
              </Text>
            </View>
          </View>

          <Text style={styles.statusMessage}>
            {isPending &&
              'Your request is being reviewed by our team. You will be notified once a decision is made.'}
            {isApproved &&
              'Congratulations! Your request has been approved. You can now create and manage events as a Head Organizer.'}
            {isRejected &&
              'Your request was not approved at this time. Please contact support for more information.'}
          </Text>

          <Text style={styles.statusDate}>
            Submitted on {new Date(existingRequest.submitted_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          {existingRequest.reviewed_at && (
            <Text style={styles.statusDate}>
              Reviewed on {new Date(existingRequest.reviewed_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Your Justification</Text>
          <Text style={[styles.statusMessage, { marginBottom: 0 }]}>
            {existingRequest.justification}
          </Text>
        </View>
      </ScrollView>
    );
  }

  // New request form
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Request Organizer Access</Text>
        <Text style={styles.subtitle}>
          Tell us why you want to become an Event Organizer. Your request will be reviewed by our
          team.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Justification</Text>
        <Text style={styles.hint}>
          Explain your experience organizing events, your plans, or why you want this access.
          Minimum 100 characters.
        </Text>
        <TextInput
          style={styles.textArea}
          value={justification}
          onChangeText={setJustification}
          placeholder="I have been organizing cosplay events for..."
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={1000}
          editable={!loading}
        />
        <Text style={[styles.charCount, !isValid && styles.charCountWarning]}>
          {charCount} / 100 characters minimum
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, (!isValid || loading) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
