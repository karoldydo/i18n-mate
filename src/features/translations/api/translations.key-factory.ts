/**
 * Query key factory for translations
 * Follows TanStack Query best practices for structured query keys
 */
export const TRANSLATIONS_KEYS = {
  all: ['translations'] as const,
  detail: (projectId: string, keyId: string, locale: string) =>
    [...TRANSLATIONS_KEYS.details(), projectId, keyId, locale] as const,
  details: () => [...TRANSLATIONS_KEYS.all, 'detail'] as const,
};
