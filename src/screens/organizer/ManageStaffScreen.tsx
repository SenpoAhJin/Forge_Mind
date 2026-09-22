/**
 * Manage Staff Screen - Head Organizers Only
 * Roster view: approved staff with their current logistics assignments
 * Allows unassigning and jumping to existing per-entry assignment flow
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useUser } from '../../contexts/UserContext';
import { useLogistics } from '../../contexts/LogisticsContext';
import { useEvents } from '../../contexts/EventsContext';
import { ConfirmationModal, StandardCard } from '../../components';
import { StaffDepartment, DEPARTMENT_LABELS, STAFF_DEPARTMENTS } from '../../types/organizer';

type DepartmentFilter = 'all' | StaffDepartment;

interface StaffMember {
  name: string;
  email: string;
  department: string;
}

type NavigationProp = NativeStackNavigationProp<any>;

export const ManageStaffScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useUser();
  const { entries, assignEntry, getEligibleStaff } = useLogistics();
  const { events } = useEvents();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDepartment, setActiveDepartment] = useState<DepartmentFilter>('all');
  const [expandedStaffEmail, setExpandedStaffEmail] = useState<string | null>(null);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<{ entryId: string; staffName: string; participantName: string } | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  // Guard: Head Organizer only
  if (user?.organizer_role !== 'head') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Head Organizer access required</Text>
      </View>
    );
  }

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const eligible = await getEligibleStaff();
      setStaff(eligible);
    } catch (error) {
      console.error('[ManageStaffScreen] Failed to load staff:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get active entries assigned to a staff member
  const getStaffAssignments = (staffEmail: string) => {
    return entries.filter(e => e.status === 'active' && e.assigned_to_email === staffEmail);
  };

  // Get departments that have at least one approved staff
  const departmentsWithStaff = Array.from(new Set(staff.map(s => s.department)));
  const departmentChips: DepartmentFilter[] = ['all', ...departmentsWithStaff.filter(d => STAFF_DEPARTMENTS.includes(d as StaffDepartment)) as StaffDepartment[]];

  // Filter staff by selected department
  const filteredStaff = activeDepartment === 'all'
    ? staff
    : staff.filter(s => s.department === activeDepartment);

  const handleUnassignConfirm = async () => {
    if (!unassignTarget || unassigning) return;

    setUnassigning(true);
    try {
      const result = await assignEntry(unassignTarget.entryId, null);
      if (result.success) {
        setShowUnassignModal(false);
        setUnassignTarget(null);
      } else {
        console.error('[ManageStaffScreen] Unassign failed:', result.error);
      }
    } catch (error) {
      console.error('[ManageStaffScreen] Unassign error:', error);
    } finally {
      setUnassigning(false);
    }
  };

  const handleAssignToEntry = (staffEmail: string) => {
    // Navigate to LogisticsHome where Head can pick an event, then an entry
    navigation.navigate('Logistics', { screen: 'LogisticsHome' });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading staff...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Department filter chips */}
      <View style={styles.chipBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          {departmentChips.map(dept => {
            const isActive = activeDepartment === dept;
            const count = dept === 'all' ? staff.length : staff.filter(s => s.department === dept).length;

            return (
              <TouchableOpacity
                key={dept}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveDepartment(dept)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {dept === 'all' ? 'All' : DEPARTMENT_LABELS[dept as StaffDepartment]} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredStaff.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
            </View>
            <Text style={styles.emptyTitle}>No approved staff</Text>
            <Text style={styles.emptyMessage}>
              {activeDepartment === 'all'
                ? 'No approved staff members yet. Use "Verify Staff by Department" to approve staff requests.'
                : `No approved staff in ${DEPARTMENT_LABELS[activeDepartment as StaffDepartment]} department.`}
            </Text>
          </View>
        ) : (
          filteredStaff.map(member => {
            const assignments = getStaffAssignments(member.email);
            const isExpanded = expandedStaffEmail === member.email;

            return (
              <View key={member.email} style={styles.staffCard}>
                {/* Staff row */}
                <TouchableOpacity
                  style={styles.staffRow}
                  onPress={() => setExpandedStaffEmail(isExpanded ? null : member.email)}
                  activeOpacity={0.7}
                >
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName} numberOfLines={1}>
                      {member.name}
                    </Text>
                    <Text style={styles.staffEmail} numberOfLines={1}>
                      {member.email}
                    </Text>
                  </View>
                  <View style={styles.staffMeta}>
                    <View style={styles.departmentTag}>
                      <Text style={styles.departmentTagText} numberOfLines={1}>
                        {DEPARTMENT_LABELS[member.department as StaffDepartment] || member.department}
                      </Text>
                    </View>
                    <Text style={styles.assignmentCount}>
                      {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
                    </Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                {/* Expanded: assignments list */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {assignments.length === 0 ? (
                      <Text style={styles.noAssignmentsText}>No active assignments</Text>
                    ) : (
                      assignments.map(entry => {
                        const event = events.find(e => e.id === entry.event_id);
                        return (
                          <View key={entry.id} style={styles.assignmentRow}>
                            <View style={styles.assignmentInfo}>
                              <Text style={styles.assignmentEvent} numberOfLines={1}>
                                {event?.name || 'Unknown Event'}
                              </Text>
                              <Text style={styles.assignmentParticipant} numberOfLines={1}>
                                {entry.participant_name}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.unassignButton}
                              onPress={() => {
                                setUnassignTarget({
                                  entryId: entry.id,
                                  staffName: member.name,
                                  participantName: entry.participant_name,
                                });
                                setShowUnassignModal(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.unassignButtonText}>Unassign</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                    <TouchableOpacity
                      style={styles.assignButton}
                      onPress={() => handleAssignToEntry(member.email)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text style={styles.assignButtonText}>Assign {member.name.split(' ')[0]} to an entry</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Unassign confirmation modal */}
      <ConfirmationModal
        visible={showUnassignModal}
        title="Unassign Staff Member"
        message={unassignTarget ? `Unassign ${unassignTarget.staffName} from ${unassignTarget.participantName}'s entry?` : ''}
        confirmText={unassigning ? 'Unassigning...' : 'Unassign'}
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={handleUnassignConfirm}
        onCancel={() => {
          setShowUnassignModal(false);
          setUnassignTarget(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  chipBar: {
    height: 56,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  chipScrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.backgroundLight,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  staffCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  staffInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  staffName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  staffEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  staffMeta: {
    alignItems: 'flex-end',
  },
  departmentTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '20',
    marginBottom: spacing.xs,
  },
  departmentTagText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  assignmentCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  noAssignmentsText: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  assignmentInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  assignmentEvent: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  assignmentParticipant: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  unassignButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error + '15',
  },
  unassignButtonText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.error,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '10',
    gap: spacing.xs,
  },
  assignButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
});
