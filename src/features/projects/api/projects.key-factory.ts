import type { ListProjectsParams } from '@/shared/types';

/**
 * Query key factory for projects
 * Follows TanStack Query best practices for structured query keys
 */
export const PROJECTS_KEY_FACTORY = {
  all: ['projects'] as const,
  detail: (id: string) => [...PROJECTS_KEY_FACTORY.details(), id] as const,
  details: () => [...PROJECTS_KEY_FACTORY.all, 'detail'] as const,
  list: (params: ListProjectsParams) => [...PROJECTS_KEY_FACTORY.lists(), params] as const,
  lists: () => [...PROJECTS_KEY_FACTORY.all, 'list'] as const,
};
