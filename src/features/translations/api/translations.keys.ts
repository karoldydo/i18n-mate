/**
 * Query key factory for translations
 * Follows TanStack Query best practices for structured query keys
 */
export const translationsKeys = {
  all: ['translations'] as const,
  detail: (projectId: string, keyId: string, locale: string) =>
    [...translationsKeys.details(), projectId, keyId, locale] as const,
  details: () => [...translationsKeys.all, 'detail'] as const,
};
