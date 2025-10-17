import type { ListProjectsParams } from '@/shared/types';

/**
 * Query key factory for projects
 * Follows TanStack Query best practices for structured query keys
 */
export const projectsKeys = {
  all: ['projects'] as const,
  detail: (id: string) => [...projectsKeys.details(), id] as const,
  details: () => [...projectsKeys.all, 'detail'] as const,
  list: (params: ListProjectsParams) => [...projectsKeys.lists(), params] as const,
  lists: () => [...projectsKeys.all, 'list'] as const,
};
