/**
 * FE-7 Step 4: Contest Manage Screen (Head Organizer)
 * Manage criteria + assign tiers + confirm/decline opt-ins
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { StandardCard, Button, Tag, ConfirmationModal } from '../../components';
import { TextInput } from 'react-native';
import { useEvents } from '../../contexts/EventsContext';
import { useContest } from '../../contexts/ContestContext';

type RouteParams = { ContestManage: { eventId: string } };

export const ContestManageScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'ContestManage'>>();
  const { eventId } = route.params;

  const { getEventById } = useEvents();
  const { getCriteriaForEvent, getOptInsForEvent, addCriterion, removeCriterion, assignTier, confirmDecision } = useContest();

  const event = getEventById(eventId);
  const criteria = getCriteriaForEvent(eventId);
  const optIns = getOptInsForEvent(eventId);

  // Criterion form state
  const [criterionLabel, setCriterionLabel] = useState('');
  const [criterionDescription, setCriterionDescription] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Selected opt-in for tier assignment
  const [selectedOptInId, setSelectedOptInId] = useState<string | null>(null);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const handleAddCriterion = async () => {
    if (!criterionLabel.trim() || !criterionDescription.trim()) {
      setModalMessage('Label and description are required');
      setShowModal(true);
      return;
    }

    const result = await addCriterion(eventId, criterionLabel, criterionDescription);
    if (result.success) {
      setCriterionLabel('');
      setCriterionDescription('');
      setModalMessage('Criterion added successfully');
    } else {
      setModalMessage(result.error || 'Failed to add criterion');
    }
    setShowModal(true);
  };

  const handleRemoveCriterion = async (criterionId: string) => {
    const result = await removeCriterion(criterionId);
    setModalMessage(result.success ? 'Criterion removed' : result.error || 'Failed to remove');
    setShowModal(true);
  };

  const handleAssignTier = async (optInId: string, criterionId: string) => {
    const result = await assignTier(optInId, criterionId);
    if (result.success) {
      setSelectedOptInId(null);
    } else {
      setModalMessage(result.error || 'Failed to assign tier');
      setShowModal(true);
    }
  };

  const handleConfirmDecision = async (optInId: string, decision: 'confirmed' | 'declined', cosplayerName: string, tierLabel?: string) => {
    const confirmMsg = decision === 'confirmed'
      ? `Confirm ${cosplayerName} in tier ${tierLabel}? This cannot be undone.`
      : `Decline ${cosplayerName}'s entry? This cannot be undone.`;

    if (!confirm(confirmMsg)) return; // Simple browser confirm for demo

    const result = await confirmDecision(optInId, decision);
    setModalMessage(result.success ? `Entry ${decision}` : result.error || 'Failed');
    setShowModal(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Criteria Section */}
        <StandardCard>
          <Text style={styles.sectionTitle}>Contest Tiers</Text>

          {criteria.length === 0 ? (
            <Text style={styles.emptyText}>No tiers defined yet. Add one below.</Text>
          ) : (
            criteria.map(criterion => (
              <View key={criterion.id} style={styles.criterionRow}>
                <View style={styles.criterionContent}>
                  <Text style={styles.criterionLabel} numberOfLines={1}>
                    {criterion.label}
                  </Text>
                  <Text style={styles.criterionDesc} numberOfLines={1}>
                    {criterion.description}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveCriterion(criterion.id)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={styles.addForm}>
            <Text style={styles.formLabel}>Add Tier</Text>
            <TextInput
              placeholder="Tier label (e.g., Novice)"
              value={criterionLabel}
              onChangeText={setCriterionLabel}
              style={styles.input}
            />
            <TextInput
              placeholder="Short description"
              value={criterionDescription}
              onChangeText={setCriterionDescription}
              style={styles.input}
            />
            <Button title="Add Tier" variant="secondary" onPress={handleAddCriterion} />
          </View>
        </StandardCard>

        {/* Opt-ins Section */}
        <StandardCard>
          <Text style={styles.sectionTitle}>Participant Opt-ins</Text>

          {optIns.length === 0 ? (
            <Text style={styles.emptyText}>No opt-ins yet</Text>
          ) : (
            optIns.map(optIn => {
              const assignedTier = optIn.assigned_tier_id ? criteria.find(c => c.id === optIn.assigned_tier_id) : null;
              const isPending = optIn.status === 'pending';

              return (
                <View key={optIn.id} style={styles.optInRow}>
                  <View style={styles.optInHeader}>
                    <Text style={styles.optInName} numberOfLines={1}>
                      {optIn.cosplayer_display_name}
                    </Text>
                    <Tag
                      type="status"
                      label={optIn.status === 'pending' ? 'Pending' : optIn.status === 'confirmed' ? 'Confirmed' : 'Declined'}
                      style={optIn.status === 'confirmed' ? styles.tagConfirmed : optIn.status === 'declined' ? styles.tagDeclined : undefined}
                    />
                  </View>

                  {assignedTier ? (
                    <Text style={styles.optInTier} numberOfLines={1}>
                      Assigned: {assignedTier.label}
                    </Text>
                  ) : null}

                  {isPending ? (
                    <View style={styles.optInControls}>
                      {criteria.length === 0 ? (
                        <Text style={styles.noTiersText}>Add tiers first to assign</Text>
                      ) : (
                        <>
                          <Text style={styles.controlLabel}>Assign Tier:</Text>
                          <View style={styles.tierChips}>
                            {criteria.map(criterion => (
                              <TouchableOpacity
                                key={criterion.id}
                                onPress={() => handleAssignTier(optIn.id, criterion.id)}
                                activeOpacity={0.7}
                              >
                                <Tag
                                  type="category"
                                  label={criterion.label}
                                  style={optIn.assigned_tier_id === criterion.id ? styles.chipSelected : undefined}
                                />
                              </TouchableOpacity>
                            ))}
                          </View>

                          {assignedTier ? (
                            <View style={styles.decisionButtons}>
                              <Button
                                title="Confirm"
                                variant="primary"
                                onPress={() => handleConfirmDecision(optIn.id, 'confirmed', optIn.cosplayer_display_name, assignedTier.label)}
                                style={styles.decisionBtn}
                              />
                              <Button
                                title="Decline"
                                variant="destructive"
                                onPress={() => handleConfirmDecision(optIn.id, 'declined', optIn.cosplayer_display_name)}
                                style={styles.decisionBtn}
                              />
                            </View>
                          ) : null}
                        </>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </StandardCard>
      </ScrollView>

      <ConfirmationModal
        visible={showModal}
        title="Notice"
        message={modalMessage}
        onConfirm={() => setShowModal(false)}
        onCancel={() => setShowModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { padding: spacing.lg },
  errorText: { ...typography.body, color: colors.error, textAlign: 'center', marginTop: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.textDisabled, fontStyle: 'italic', marginBottom: spacing.md },
  criterionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  criterionContent: { flex: 1 },
  criterionLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  criterionDesc: { ...typography.caption, color: colors.textSecondary },
  addForm: { marginTop: spacing.md },
  formLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  input: { marginBottom: spacing.sm },
  optInRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 80 },
  optInHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  optInName: { ...typography.body, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  optInTier: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  optInControls: { marginTop: spacing.sm },
  controlLabel: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  tierChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  noTiersText: { ...typography.caption, color: colors.textDisabled, fontStyle: 'italic' },
  decisionButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  decisionBtn: { flex: 1 },
  tagConfirmed: { backgroundColor: colors.success },
  tagDeclined: { backgroundColor: colors.error },
});
