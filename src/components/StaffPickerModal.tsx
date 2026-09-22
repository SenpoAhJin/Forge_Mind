/**
 * Staff Picker Modal
 * Select staff member to assign to logistics entry
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { Button } from './buttons';
import { DEPARTMENT_LABELS } from '../types/organizer';

interface Staff {
  name: string;
  email: string;
  department: string;
}

interface StaffPickerModalProps {
  visible: boolean;
  staff: Staff[];
  selectedEmail: string | null;
  onSelect: (email: string | null) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

export const StaffPickerModal: React.FC<StaffPickerModalProps> = ({
  visible,
  staff,
  selectedEmail,
  onSelect,
  onSave,
  onCancel,
  saving,
}) => {
  const isEmpty = staff.length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Assign Staff</Text>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.listContainer}>
            {/* Unassigned option */}
            <TouchableOpacity
              style={[styles.row, selectedEmail === null && styles.rowSelected]}
              onPress={() => onSelect(null)}
              activeOpacity={0.7}
            >
              <View style={styles.rowContent}>
                <Text style={styles.staffName}>Unassigned</Text>
              </View>
              {selectedEmail === null ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              ) : null}
            </TouchableOpacity>

            {/* Staff list */}
            {isEmpty ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No approved staff yet. Approve staff in Verify Staff first.
                </Text>
              </View>
            ) : (
              staff.map((member) => {
                const isSelected = selectedEmail === member.email;
                const deptLabel = DEPARTMENT_LABELS[member.department as keyof typeof DEPARTMENT_LABELS] || member.department;

                return (
                  <TouchableOpacity
                    key={member.email}
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => onSelect(member.email)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowContent}>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <Text style={styles.staffEmail} numberOfLines={1}>
                        {member.email}
                      </Text>
                      <Text style={styles.staffDepartment} numberOfLines={1}>
                        {deptLabel}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="secondary"
              style={styles.button}
            />
            <Button
              title={saving ? 'Saving...' : 'Save'}
              onPress={onSave}
              disabled={isEmpty || saving}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  listContainer: {
    maxHeight: 400,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 72,
  },
  rowSelected: {
    backgroundColor: colors.backgroundLight,
  },
  rowContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  staffName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  staffEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  staffDepartment: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});
