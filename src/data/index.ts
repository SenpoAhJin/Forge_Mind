/**
 * ForgeMind Catalog Data Access
 * The mock dataset lives in characters.json / variants.json (real-import ready).
 * These accessors centralize lookups so components never walk the JSON directly.
 */

import charactersRaw from './characters.json';
import variantsRaw from './variants.json';
import projectsRaw from './projects.json';
import tasksRaw from './tasks.json';
import budgetItemsRaw from './budget_items.json';
import matchComponentsRaw from './match_components.json';
import { Character, Variant } from '../types/catalog';
import { Project, Task, BudgetLineItem, MatchComponent } from '../types/projects';

export const characters: Character[] = charactersRaw as Character[];
export const variants: Variant[] = variantsRaw as Variant[];

export const getCharacterById = (characterId: string): Character | undefined =>
  characters.find((c) => c.character_id === characterId);

export const getVariantsByCharacterId = (characterId: string): Variant[] =>
  variants.filter((v) => v.character_id === characterId);

export const getVariantById = (variantId: string): Variant | undefined =>
  variants.find((v) => v.variant_id === variantId);

export const searchCharacters = (query: string): Character[] => {
  const q = query.trim().toLowerCase();
  if (!q) return characters;
  return characters.filter(
    (c) =>
      c.character_name.toLowerCase().includes(q) ||
      c.source_media.toLowerCase().includes(q)
  );
};

export const projects: Project[] = projectsRaw as Project[];
export const tasks: Task[] = tasksRaw as Task[];
export const budgetItems: BudgetLineItem[] = budgetItemsRaw as BudgetLineItem[];
export const matchComponents: MatchComponent[] = matchComponentsRaw as MatchComponent[];

export const getProjectById = (projectId: string): Project | undefined =>
  projects.find((p) => p.project_id === projectId);

export const getTasksForProject = (projectId: string): Task[] =>
  tasks
    .filter((t) => t.project_id === projectId)
    .sort((a, b) => a.task_order - b.task_order);

export const getBudgetForProject = (projectId: string): BudgetLineItem[] =>
  budgetItems.filter((b) => b.project_id === projectId);