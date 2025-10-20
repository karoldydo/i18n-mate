/**
 * Query key factory for project locales
 *
 * Follows TanStack Query best practices for structured query keys.
 * Keys are organized hierarchically to enable granular cache invalidation.
 *
 * @example
 * // invalidate all locale queries
 * queryClient.invalidateQueries({ queryKey: LOCALES_KEYS.all })
 *
 * // invalidate all locale lists
 * queryClient.invalidateQueries({ queryKey: LOCALES_KEYS.lists() })
 *
 * // invalidate specific project's locales
 * queryClient.invalidateQueries({ queryKey: LOCALES_KEYS.list(projectId) })
 */
export const LOCALES_KEYS = {
  all: ['project-locales'] as const,
  detail: (id: string) => [...LOCALES_KEYS.details(), id] as const,
  details: () => [...LOCALES_KEYS.all, 'detail'] as const,
  list: (projectId: string) => [...LOCALES_KEYS.lists(), projectId] as const,
  lists: () => [...LOCALES_KEYS.all, 'list'] as const,
};
