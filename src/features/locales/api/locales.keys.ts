/**
 * Query key factory for project locales
 *
 * Follows TanStack Query best practices for structured query keys.
 * Keys are organized hierarchically to enable granular cache invalidation.
 *
 * @example
 * // Invalidate all locale queries
 * queryClient.invalidateQueries({ queryKey: localesKeys.all })
 *
 * // Invalidate all locale lists
 * queryClient.invalidateQueries({ queryKey: localesKeys.lists() })
 *
 * // Invalidate specific project's locales
 * queryClient.invalidateQueries({ queryKey: localesKeys.list(projectId) })
 */
export const localesKeys = {
  all: ['project-locales'] as const,
  detail: (id: string) => [...localesKeys.details(), id] as const,
  details: () => [...localesKeys.all, 'detail'] as const,
  list: (projectId: string) => [...localesKeys.lists(), projectId] as const,
  lists: () => [...localesKeys.all, 'list'] as const,
};
