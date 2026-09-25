/**
 * ForgeMind - Projects Context
 * Mock/local project state seeded from src/data (fresh on reload, like the FE-3 selection store).
 * Mutations: create project, add task, change task status, add budget line item.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Project, Task, BudgetLineItem, ProjectStatus, TaskStatus, BudgetCategory } from '../types/projects';
import { ProjectMilestone } from '../types/milestones';
import { projects as seedProjects, tasks as seedTasks, budgetItems as seedBudgetItems } from '../data';
import { useEvents } from './EventsContext';
import { useUser } from './UserContext';

interface NewProjectInput {
  character_id: string;
  variant_id: string;
  project_name: string;
  stated_budget?: number | null;
  stated_skill_level: Project['stated_skill_level'];
  start_date: string;
  target_completion_date?: string | null;
  opted_in_readiness_sharing: boolean;
}

interface NewBudgetInput {
  item_name: string;
  category: BudgetCategory;
  planned_amount: number;
  actual_amount: number;
}

interface ProjectsContextValue {
  projects: Project[];
  tasks: Task[];
  budgetItems: BudgetLineItem[];
  milestones: ProjectMilestone[];
  addProject: (input: NewProjectInput) => Project;
  addTask: (projectId: string, description: string) => void;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  addBudgetItem: (projectId: string, input: NewBudgetInput) => void;
  setLinkedEvent: (projectId: string, eventId: string | null) => { success: boolean; error?: string };
  addMilestone: (projectId: string, label: string, targetDate: string) => { success: boolean; error?: string };
  toggleMilestone: (milestoneId: string) => void;
  getTasksForProject: (projectId: string) => Task[];
  getBudgetForProject: (projectId: string) => BudgetLineItem[];
  getMilestonesForProject: (projectId: string) => ProjectMilestone[];
}

const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

const nowIso = () => new Date().toISOString();

export const ProjectsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>(seedBudgetItems);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  
  const { getEventById } = useEvents();

  useEffect(() => {
    setProjects(
      user
        ? seedProjects.map(project => ({ ...project, user_id: user.email }))
        : []
    );
    setTasks(seedTasks);
    setBudgetItems(seedBudgetItems);
    setMilestones([]);
  }, [user?.email]);

  const addProject = (input: NewProjectInput): Project => {
    const project: Project = {
      project_id: `proj-${Date.now()}`,
      user_id: user?.email ?? 'demo-user-1',
      character_id: input.character_id,
      variant_id: input.variant_id,
      project_name: input.project_name,
      stated_budget: input.stated_budget ?? null,
      stated_skill_level: input.stated_skill_level,
      start_date: input.start_date,
      target_completion_date: input.target_completion_date ?? null,
      linked_event_id: null,
      opted_in_readiness_sharing: input.opted_in_readiness_sharing,
      status: 'planning' as ProjectStatus,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    setProjects((prev) => [project, ...prev]);
    return project;
  };

  const addTask = (projectId: string, description: string) => {
    const order = tasks.filter((t) => t.project_id === projectId).length + 1;
    const task: Task = {
      task_id: `task-${Date.now()}`,
      project_id: projectId,
      task_description: description,
      task_order: order,
      difficulty_rating: null,
      technique_tags: null,
      estimated_time_hours: null,
      actual_completion_date: null,
      actual_time_spent_hours: null,
      status: 'pending',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    setTasks((prev) => [...prev, task]);
  };

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.task_id === taskId
          ? {
              ...t,
              status,
              actual_completion_date: status === 'completed' ? nowIso().slice(0, 10) : t.actual_completion_date,
              updated_at: nowIso(),
            }
          : t
      )
    );
  };

  const addBudgetItem = (projectId: string, input: NewBudgetInput) => {
    const item: BudgetLineItem = {
      budget_line_item_id: `budget-${Date.now()}`,
      project_id: projectId,
      item_name: input.item_name,
      category: input.category,
      planned_amount: input.planned_amount,
      actual_amount: input.actual_amount,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    setBudgetItems((prev) => [...prev, item]);
  };

  const getTasksForProject = (projectId: string) =>
    tasks.filter((t) => t.project_id === projectId).sort((a, b) => a.task_order - b.task_order);

  const getBudgetForProject = (projectId: string) =>
    budgetItems.filter((b) => b.project_id === projectId);

  const setLinkedEvent = (projectId: string, eventId: string | null): { success: boolean; error?: string } => {
    // Validate event exists and is confirmed if eventId provided
    if (eventId) {
      const event = getEventById(eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }
      if (event.status !== 'confirmed') {
        return { success: false, error: 'Can only link to confirmed events' };
      }
    }

    // Update project
    setProjects((prev) =>
      prev.map((p) =>
        p.project_id === projectId
          ? { ...p, linked_event_id: eventId, updated_at: nowIso() }
          : p
      )
    );

    return { success: true };
  };

  const addMilestone = (
    projectId: string,
    label: string,
    targetDate: string
  ): { success: boolean; error?: string } => {
    const project = projects.find((p) => p.project_id === projectId);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    if (!project.linked_event_id) {
      return { success: false, error: 'Project must be linked to an event to add milestones' };
    }

    const event = getEventById(project.linked_event_id);
    if (!event) {
      return { success: false, error: 'Linked event not found' };
    }

    // Validate target_date <= event start_date
    if (targetDate > event.start_date) {
      return { success: false, error: `Milestone date must be on or before event start (${event.start_date})` };
    }

    const milestone: ProjectMilestone = {
      milestone_id: `milestone-${Date.now()}`,
      project_id: projectId,
      label,
      target_date: targetDate,
      is_complete: false,
      created_at: nowIso(),
    };

    setMilestones((prev) => [...prev, milestone]);
    return { success: true };
  };

  const toggleMilestone = (milestoneId: string) => {
    setMilestones((prev) =>
      prev.map((m) =>
        m.milestone_id === milestoneId ? { ...m, is_complete: !m.is_complete } : m
      )
    );
  };

  const getMilestonesForProject = (projectId: string) =>
    milestones
      .filter((m) => m.project_id === projectId)
      .sort((a, b) => a.target_date.localeCompare(b.target_date));

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        tasks,
        budgetItems,
        milestones,
        addProject,
        addTask,
        setTaskStatus,
        addBudgetItem,
        setLinkedEvent,
        addMilestone,
        toggleMilestone,
        getTasksForProject,
        getBudgetForProject,
        getMilestonesForProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
};