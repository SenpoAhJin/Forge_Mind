import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { OrganizerService } from '../../services/OrganizerService';
import { AuthService } from '../../services/AuthService';
import { OrganizerAccessRequest } from '../../types/organizer';
import { Ionicons } from '@expo/vector-icons';

export default function HolderReviewQueueScreen({ navigation }: any) {
  const { user } = useUser();
  const [requests, setRequests] = useState<OrganizerAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.is_holder_verified) {
      Alert.alert('Access Denied', 'Only verified Holders can access this screen.');
      navigation.goBack();
      return;
    }
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const pendingRequests = await OrganizerService.getPendingAccessRequests();
      setRequests(pendingRequests);
    } catch (error) {
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: OrganizerAccessRequest) => {
    if (!user?.email) return;

    Alert.alert(
      'Approve Request',
      `Approve ${request.user_id} as a Head Organizer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(request.request_id);
            try {
              // Approve the request
              await OrganizerService.approveAccessRequest(
                request.request_id,
                user.email
              );
              
              // Update the user's organizer role
              await AuthService.updateOrganizerRole(request.user_id, 'head');
              
              Alert.alert('Success', 'Request approved successfully');
              
              // Reload the list
              await loadRequests();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to approve request');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (request: OrganizerAccessRequest) => {
    if (!user?.email) return;

    Alert.alert(
      'Reject Request',
      `Reject ${request.user_id}'s request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(request.request_id);
            try {
              await OrganizerService.rejectAccessRequest(
                request.request_id,
                user.email
              );
              
              Alert.alert('Success', 'Request rejected');
              
              // Reload the list
              await loadRequests();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to reject request');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
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
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl * 2,
    },
    emptyIcon: {
      marginBottom: spacing.lg,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    requestCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    requestHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    requestIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    requestInfo: {
      flex: 1,
    },
    requestName: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    requestEmail: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    requestDate: {
      fontSize: 13,
      color: colors.textDisabled,
      marginBottom: spacing.md,
    },
    justificationLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    justificationText: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 22,
      marginBottom: spacing.lg,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
      borderRadius: 8,
      gap: spacing.xs,
    },
    approveButton: {
      backgroundColor: colors.success,
    },
    rejectButton: {
      backgroundColor: colors.error,
    },
    actionButtonDisabled: {
      backgroundColor: colors.border,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Organizer Access Requests</Text>
        <Text style={styles.subtitle}>
          Review and approve requests from users who want to become Event Organizers.
        </Text>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="checkmark-done-outline"
            size={64}
            color={colors.textDisabled}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>
            No pending requests at this time.
          </Text>
        </View>
      ) : (
        requests.map((request) => {
          const isProcessing = processingId === request.request_id;
          
          return (
            <View key={request.request_id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestIcon}>
                  <Ionicons name="person-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{request.user_id}</Text>
                  <Text style={styles.requestEmail}>{request.user_id}</Text>
                </View>
              </View>

              <Text style={styles.requestDate}>
                Submitted {new Date(request.submitted_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              <Text style={styles.justificationLabel}>Justification</Text>
              <Text style={styles.justificationText}>{request.justification}</Text>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.approveButton,
                    isProcessing && styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleApprove(request)}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.rejectButton,
                    isProcessing && styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleReject(request)}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
