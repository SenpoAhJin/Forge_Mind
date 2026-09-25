/**
 * ForgeMind - Project Dashboard Screen (FE-4)
 * Task list (add / status change), budget tracker (planned vs spent),
 * computed readiness score, and a clearly-labeled static 3D preview slot.
 * 3D rendering is NOT implemented here (Phase 2 / future stage).
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandardCard, Button, Tag, TextInputField, StatusBadge, BodySizeSlider, ThreeDPreview } from '../../components';
import { DateInput } from '../../components/inputs/DateInput';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useProjects } from '../../contexts/ProjectsContext';
import { useEvents } from '../../contexts/EventsContext';
import { useUser } from '../../contexts/UserContext';
import { getCharacterById, getVariantById } from '../../data';
import { computeReadiness } from '../../utils/readiness';
import { Project, Task, TaskStatus, BudgetCategory } from '../../types/projects';
import { getTodayLocal } from '../../utils/dateHelpers';

interface ProjectDashboardScreenProps {
  projectId: string;
}

const badgeStatusFor = (status: Project['status']): 'pending' | 'active' | 'completed' | 'cancelled' => {
  switch (status) {
    case 'planning':
      return 'pending';
    case 'in-progress':
      return 'active';
    case 'completed':
      return 'completed';
    case 'abandoned':
      return 'cancelled';
    default:
      return 'pending';
  }
};

const NEXT_TASK_STATUS: Record<TaskStatus, TaskStatus> = {
  pending: 'in-progress',
  'in-progress': 'completed',
  completed: 'pending',
  skipped: 'pending',
};

const nextActionLabel = (status: TaskStatus): string => {
  switch (status) {
    case 'pending':
      return 'Start';
    case 'in-progress':
      return 'Complete';
    case 'completed':
      return 'Reopen';
    case 'skipped':
      return 'Restore';
    default:
      return 'Advance';
  }
};

const CATEGORY_OPTIONS: { key: BudgetCategory; label: string }[] = [
  { key: 'material', label: 'Material' },
  { key: 'labor', label: 'Labor' },
  { key: 'tool', label: 'Tool' },
  { key: 'other', label: 'Other' },
];

const formatPeso = (value: number) => {
  const sign = value < 0 ? '-' : '';
  return `${sign}₱${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const ProjectDashboardScreen: React.FC<ProjectDashboardScreenProps> = ({ projectId }) => {
  const { projects, getTasksForProject, getBudgetForProject, getMilestonesForProject, addTask, setTaskStatus, addBudgetItem, setLinkedEvent, addMilestone, toggleMilestone } = useProjects();
  const { events, getEventById } = useEvents();
  const { user, setUserBody } = useUser();

  const project = projects.find((p) => p.project_id === projectId);

  const [newTaskText, setNewTaskText] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newPlanned, setNewPlanned] = useState('');
  const [newActual, setNewActual] = useState('');
  const [newCategory, setNewCategory] = useState<BudgetCategory>('material');
  
  // 3D Preview body size state (synced with user profile)
  const [localBodySize, setLocalBodySize] = useState(user?.body_size_slider ?? 0.5);
  
  // Event linking state
  const [showEventPicker, setShowEventPicker] = useState(false);
  
  // Milestone state
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState(getTodayLocal());
  const [milestoneError, setMilestoneError] = useState('');

  const projectTasks = useMemo(
    () => (project ? getTasksForProject(project.project_id) : []),
    [project, getTasksForProject]
  );
  const projectBudget = useMemo(
    () => (project ? getBudgetForProject(project.project_id) : []),
    [project, getBudgetForProject]
  );
  const projectMilestones = useMemo(
    () => (project ? getMilestonesForProject(project.project_id) : []),
    [project, getMilestonesForProject]
  );

  const confirmedEvents = events.filter((e) => e.status === 'confirmed');
  const linkedEvent = project?.linked_event_id ? getEventById(project.linked_event_id) : null;

  // Debug logging
  console.log('[ProjectDashboard] Project:', project?.project_name);
  console.log('[ProjectDashboard] Project linked_event_id:', project?.linked_event_id);
  console.log('[ProjectDashboard] Linked event found:', linkedEvent ? { id: linkedEvent.id, name: linkedEvent.name, date: linkedEvent.start_date } : 'null');
  console.log('[ProjectDashboard] All confirmed events:', confirmedEvents.map(e => ({ id: e.id, name: e.name, date: e.start_date })));
  
  // Validation: if linked event ID exists but event not found, show error
  if (project?.linked_event_id && !linkedEvent) {
    console.error('[ProjectDashboard] ERROR: Project has linked_event_id but event not found!', project.linked_event_id);
  }

  if (!project) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyTitle}>Project not found</Text>
        <Text style={styles.emptyBody}>This project is not in the local dataset.</Text>
      </View>
    );
  }

  const character = getCharacterById(project.character_id);
  const variant = getVariantById(project.variant_id);
  const readiness = computeReadiness({ project, projectTasks, projectBudget });

  const spent = projectBudget.reduce((sum, b) => sum + b.actual_amount, 0);
  const planned = projectBudget.reduce((sum, b) => sum + b.planned_amount, 0);
  const remaining = (project.stated_budget ?? planned) - spent;
  const budgetPct = project.stated_budget && project.stated_budget > 0 ? Math.min(100, (spent / project.stated_budget) * 100) : 0;
  const completedCount = projectTasks.filter((t) => t.status === 'completed').length;

  const handleAddTask = () => {
    const description = newTaskText.trim();
    if (!description) return;
    addTask(projectId, description);
    setNewTaskText('');
  };

  const handleAddBudgetItem = () => {
    const itemName = newItemName.trim();
    const plannedAmount = parseFloat(newPlanned);
    const actualAmount = parseFloat(newActual);
    if (!itemName || Number.isNaN(plannedAmount) || Number.isNaN(actualAmount)) return;
    addBudgetItem(projectId, { item_name: itemName, category: newCategory, planned_amount: plannedAmount, actual_amount: actualAmount });
    setNewItemName('');
    setNewPlanned('');
    setNewActual('');
  };

  const handleLinkEvent = (eventId: string | null) => {
    console.log('[ProjectDashboard] Linking event ID:', eventId);
    const result = setLinkedEvent(projectId, eventId);
    console.log('[ProjectDashboard] Link result:', result);
    if (!result.success) {
      setMilestoneError(result.error || 'Failed to link event');
    } else {
      setShowEventPicker(false);
      setMilestoneError('');
    }
  };

  const handleAddMilestone = () => {
    const label = newMilestoneLabel.trim();
    if (!label) return;
    
    const result = addMilestone(projectId, label, newMilestoneDate);
    if (!result.success) {
      setMilestoneError(result.error || 'Failed to add milestone');
    } else {
      setNewMilestoneLabel('');
      setNewMilestoneDate(getTodayLocal());
      setMilestoneError('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StandardCard style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerMeta}>
            <Text style={styles.projectName}>{project.project_name}</Text>
            <Text style={styles.projectSub}>
              {character?.character_name ?? 'Unknown character'}
              {variant ? ` · ${variant.variant_name}` : ''}
            </Text>
          </View>
          <StatusBadge status={badgeStatusFor(project.status)} label={project.status} />
        </View>
        <View style={styles.headerTags}>
          <Tag type="category" label={`Skill: ${project.stated_skill_level}`} />
          <Tag type="status" label={readiness.matched_components.length > 0 ? 'Items matched' : 'No items matched'} />
        </View>
      </StandardCard>

      {/* Event Linking Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Linked Event</Text>
        {linkedEvent ? (
          <StandardCard style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <View style={styles.eventInfo}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <View style={styles.eventTextWrap}>
                  <Text style={styles.eventName} numberOfLines={1}>{linkedEvent.name}</Text>
                  <Text style={styles.eventDate}>{linkedEvent.start_date}</Text>
                </View>
              </View>
              <Button
                title="Unlink"
                variant="tertiary"
                onPress={() => handleLinkEvent(null)}
              />
            </View>
          </StandardCard>
        ) : (
          <>
            <Text style={styles.sectionEmpty}>Link to a confirmed event to track milestones and build an itinerary</Text>
            {showEventPicker ? (
              <View style={styles.pickerWrap}>
                {confirmedEvents.length === 0 ? (
                  <Text style={styles.pickerEmpty}>No confirmed events available</Text>
                ) : (
                  <>
                    {confirmedEvents.map((event) => (
                      <TouchableOpacity
                        key={event.id}
                        style={styles.pickerOption}
                        onPress={() => handleLinkEvent(event.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.pickerOptionText} numberOfLines={1}>{event.name}</Text>
                        <Text style={styles.pickerOptionDate}>{event.start_date}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                <Button
                  title="Cancel"
                  variant="tertiary"
                  onPress={() => setShowEventPicker(false)}
                  fullWidth
                />
              </View>
            ) : (
              <Button
                title="Link Event"
                variant="secondary"
                onPress={() => setShowEventPicker(true)}
                fullWidth
              />
            )}
          </>
        )}
      </View>

      {/* Milestones Section */}
      {linkedEvent ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          
          {projectMilestones.length === 0 && (
            <Text style={styles.sectionEmpty}>No milestones yet — add your first countdown checkpoint</Text>
          )}

          {projectMilestones.map((milestone) => (
            <StandardCard key={milestone.milestone_id} style={styles.milestoneCard}>
              <TouchableOpacity
                style={styles.milestoneRow}
                onPress={() => toggleMilestone(milestone.milestone_id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={milestone.is_complete ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={milestone.is_complete ? colors.success : colors.textSecondary}
                />
                <View style={styles.milestoneTextWrap}>
                  <Text style={[styles.milestoneLabel, milestone.is_complete && styles.milestoneLabelDone]} numberOfLines={1}>
                    {milestone.label}
                  </Text>
                  <Text style={styles.milestoneDate}>{milestone.target_date}</Text>
                </View>
              </TouchableOpacity>
            </StandardCard>
          ))}

          <View style={styles.inlineForm}>
            <TextInputField
              label="Milestone label"
              value={newMilestoneLabel}
              onChangeText={setNewMilestoneLabel}
              placeholder="e.g. Finish wig styling"
            />
            <DateInput
              label="Target date"
              value={newMilestoneDate}
              onChange={setNewMilestoneDate}
              maxDate={linkedEvent.start_date}
            />
            {milestoneError ? <Text style={styles.errorText}>{milestoneError}</Text> : null}
            <Button title="Add Milestone" variant="secondary" onPress={handleAddMilestone} fullWidth />
          </View>
        </View>
      ) : null}

      <StandardCard style={styles.readinessCard}>
        <View style={styles.readinessHeader}>
          <Text style={styles.sectionTitle}>Readiness</Text>
          <Text style={styles.readinessScore}>{Math.round(readiness.readiness_score * 100)}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.round(readiness.readiness_score * 100)}%`, backgroundColor: readiness.readiness_score >= 0.6 ? colors.success : readiness.readiness_score >= 0.3 ? colors.warning : colors.error },
            ]}
          />
        </View>
        <View style={styles.readinessBreakdown}>
          <Text style={styles.breakdownRow}>
            Tasks: {completedCount}/{projectTasks.length} done ({projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0}%)
          </Text>
          <Text style={styles.breakdownRow}>
            Owned-item match: {readiness.matched_components.length} matched, {readiness.missing_components.length} missing
          </Text>
          <Text style={styles.breakdownRow}>
            Budget: {Math.round(readiness.budget_utilization)}% utilized
          </Text>
        </View>
        <Text style={styles.timestamp}>
          Calculated {new Date(readiness.calculation_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · mock formula, real AI readiness in a later phase
        </Text>
      </StandardCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3D Preview</Text>
        <Text style={styles.sectionDescription}>
          Procedural placeholder showing selected variant with your body representation. 
          Drag to rotate, pinch to zoom.
        </Text>
        
        <View style={styles.previewContainer}>
          <ThreeDPreview 
            bodySizeValue={localBodySize} 
            width={300} 
            height={400} 
          />
        </View>

        <View style={styles.sliderSection}>
          <BodySizeSlider
            value={localBodySize}
            onValueChange={(newValue) => {
              setLocalBodySize(newValue);
              // Sync to user profile in real-time
              if (user) {
                setUserBody(user.base_body_selection, newValue);
              }
            }}
            label="Adjust Body Size"
          />
          <Text style={styles.previewNote}>
            Slider controls body deformation · Garment placeholder attached to procedural body
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <Text style={styles.sectionCount}>{completedCount}/{projectTasks.length}</Text>
        </View>

        {projectTasks.length === 0 && (
          <Text style={styles.sectionEmpty}>No tasks yet — add the first one below.</Text>
        )}

        {projectTasks.map((task) => (
          <StandardCard key={task.task_id} style={styles.taskCard}>
            <View style={styles.taskRow}>
              <View style={styles.taskTextWrap}>
                <Text style={[styles.taskText, task.status === 'completed' && styles.taskTextDone]} numberOfLines={2}>
                  {task.task_description}
                </Text>
                <View style={styles.taskMeta}>
                  {task.difficulty_rating != null && (
                    <Text style={styles.taskMetaText}>Difficulty {task.difficulty_rating}/5</Text>
                  )}
                  {task.estimated_time_hours != null && (
                    <Text style={styles.taskMetaText}>~{task.estimated_time_hours}h</Text>
                  )}
                  {task.technique_tags != null && task.technique_tags.length > 0 && (
                    <Text style={styles.taskMetaText}>{task.technique_tags.join(', ')}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.taskAction, task.status === 'completed' && styles.taskActionDone]}
                onPress={() => setTaskStatus(task.task_id, NEXT_TASK_STATUS[task.status])}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={task.status === 'completed' ? 'checkmark-circle' : task.status === 'in-progress' ? 'time' : 'ellipse-outline'}
                  size={18}
                  color={task.status === 'completed' ? colors.backgroundLight : colors.primary}
                />
                <Text style={[styles.taskActionText, task.status === 'completed' && styles.taskActionTextDone]}>
                  {nextActionLabel(task.status)}
                </Text>
              </TouchableOpacity>
            </View>
          </StandardCard>
        ))}

        <View style={styles.inlineForm}>
          <TextInputField
            value={newTaskText}
            onChangeText={setNewTaskText}
            placeholder="New task description"
          />
          <Button title="Add Task" variant="secondary" onPress={handleAddTask} fullWidth />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Budget</Text>

        <StandardCard style={styles.budgetCard}>
          <View style={styles.budgetRow}>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatLabel}>Stated budget</Text>
              <Text style={styles.budgetStatValue}>{project.stated_budget != null ? formatPeso(project.stated_budget) : '—'}</Text>
            </View>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatLabel}>Planned items</Text>
              <Text style={styles.budgetStatValue}>{formatPeso(planned)}</Text>
            </View>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatLabel}>Spent</Text>
              <Text style={[styles.budgetStatValue, { color: spent > 0 ? colors.error : colors.textPrimary }]}>
                {formatPeso(spent)}
              </Text>
            </View>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatLabel}>Remaining</Text>
              <Text style={[styles.budgetStatValue, { color: remaining < 0 ? colors.error : colors.success }]}>
                {formatPeso(remaining)}
              </Text>
            </View>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${budgetPct}%`, backgroundColor: budgetPct >= 80 ? colors.error : colors.warning }]} />
          </View>
        </StandardCard>

        {projectBudget.map((item) => (
          <StandardCard key={item.budget_line_item_id} style={styles.budgetLine}>
            <View style={styles.budgetLineHeader}>
              <Text style={styles.budgetLineName} numberOfLines={1}>{item.item_name}</Text>
              <Tag type="category" label={item.category} />
            </View>
            <View style={styles.budgetLineAmounts}>
              <Text style={styles.budgetLinePlanned}>planned {formatPeso(item.planned_amount)}</Text>
              <Text style={[styles.budgetLineActual, item.actual_amount > 0 && { color: colors.primary }]}>
                spent {formatPeso(item.actual_amount)}
              </Text>
            </View>
          </StandardCard>
        ))}

        <StandardCard style={styles.inlineFormCard}>
          <Text style={styles.inlineFormTitle}>Add budget line item</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.categoryChip, newCategory === option.key && styles.categoryChipActive]}
                onPress={() => setNewCategory(option.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, newCategory === option.key && styles.categoryChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInputField value={newItemName} onChangeText={setNewItemName} placeholder="Item name" />
          <View style={styles.amountRow}>
            <View style={styles.amountField}>
              <TextInputField value={newPlanned} onChangeText={setNewPlanned} placeholder="Planned (₱)" keyboardType="numeric" />
            </View>
            <View style={styles.amountField}>
              <TextInputField value={newActual} onChangeText={setNewActual} placeholder="Spent (₱)" keyboardType="numeric" />
            </View>
          </View>
          <Button title="Add Budget Item" variant="tertiary" onPress={handleAddBudgetItem} fullWidth />
        </StandardCard>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerCard: {
    marginBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerMeta: {
    flex: 1,
  },
  projectName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  projectSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerTags: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  readinessCard: {
    marginBottom: spacing.lg,
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  readinessScore: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  barTrack: {
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  readinessBreakdown: {
    marginTop: spacing.md,
  },
  breakdownRow: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textDisabled,
    marginTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionCount: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  sectionEmpty: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sliderSection: {
    paddingHorizontal: spacing.md,
  },
  previewNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  sectionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  taskCard: {
    marginBottom: spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  taskTextWrap: {
    flex: 1,
  },
  taskText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  taskTextDone: {
    color: colors.textDisabled,
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  taskMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  taskAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  taskActionDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  taskActionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  taskActionTextDone: {
    color: colors.backgroundLight,
  },
  inlineForm: {
    marginTop: spacing.md,
  },
  budgetCard: {
    marginBottom: spacing.md,
  },
  budgetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  budgetStat: {
    width: '50%',
    marginBottom: spacing.md,
  },
  budgetStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  budgetStatValue: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  budgetLine: {
    marginBottom: spacing.sm,
  },
  budgetLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  budgetLineName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  budgetLineAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  budgetLinePlanned: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  budgetLineActual: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inlineFormCard: {
    marginTop: spacing.md,
  },
  inlineFormTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: colors.backgroundLight,
  },
  amountRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  amountField: {
    flex: 1,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  eventCard: {
    marginBottom: spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  eventTextWrap: {
    flex: 1,
  },
  eventName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  eventDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerWrap: {
    gap: spacing.sm,
  },
  pickerEmpty: {
    ...typography.body,
    color: colors.textDisabled,
    textAlign: 'center',
    padding: spacing.lg,
  },
  pickerOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  pickerOptionText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  pickerOptionDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  milestoneCard: {
    marginBottom: spacing.sm,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  milestoneTextWrap: {
    flex: 1,
  },
  milestoneLabel: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  milestoneLabelDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  milestoneDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});