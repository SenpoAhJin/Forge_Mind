/**
 * Staff Picker Modal
 * Select staff member to assign to logistics entry
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius } from '../theme';
import { Button } from './buttons';
import { DEPARTMENT_LABELS } from '../types/organizer';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

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

const getDynamicStyles = (themeColors: ThemeColors) => ({
  modalContainer: { backgroundColor: themeColors.surface },
  header: { borderBottomColor: themeColors.border },
  title: { color: themeColors.textPrimary },
  row: { borderBottomColor: themeColors.border },
  rowSelected: { backgroundColor: themeColors.backgroundLight },
  staffName: { color: themeColors.textPrimary },
  staffEmail: { color: themeColors.textSecondary },
  staffDepartment: { color: themeColors.textSecondary },
  emptyText: { color: themeColors.textSecondary },
  footer: { borderTopColor: themeColors.border },
});

export const StaffPickerModal: React.FC<StaffPickerModalProps> = ({
  visible,
  staff,
  selectedEmail,
  onSelect,
  onSave,
  onCancel,
  saving,
}) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  const isEmpty = staff.length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, dynamicStyles.modalContainer]}>
          <View style={[styles.header, dynamicStyles.header]}>
            <Text style={[styles.title, dynamicStyles.title]}>Assign Staff</Text>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.listContainer}>
            {/* Unassigned option */}
            <TouchableOpacity
              style={[styles.row, dynamicStyles.row, selectedEmail === null ? dynamicStyles.rowSelected : null]}
              onPress={() => onSelect(null)}
              activeOpacity={0.7}
            >
              <View style={styles.rowContent}>
                <Text style={[styles.staffName, dynamicStyles.staffName]}>Unassigned</Text>
              </View>
              {selectedEmail === null ? (
                <Ionicons name="checkmark-circle" size={24} color={themeColors.primary} />
              ) : null}
            </TouchableOpacity>

            {/* Staff list */}
            {isEmpty ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
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
                    style={[styles.row, dynamicStyles.row, isSelected ? dynamicStyles.rowSelected : null]}
                    onPress={() => onSelect(member.email)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowContent}>
                      <Text style={[styles.staffName, dynamicStyles.staffName]} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <Text style={[styles.staffEmail, dynamicStyles.staffEmail]} numberOfLines={1}>
                        {member.email}
                      </Text>
                      <Text style={[styles.staffDepartment, dynamicStyles.staffDepartment]} numberOfLines={1}>
                        {deptLabel}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color={themeColors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={[styles.footer, dynamicStyles.footer]}>
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
  },
  title: {
    ...typography.h2,
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
    minHeight: 72,
  },
  rowSelected: {},
  rowContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  staffName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  staffEmail: {
    ...typography.caption,
    marginBottom: 2,
  },
  staffDepartment: {
    ...typography.caption,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});
