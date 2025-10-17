import type { ListKeysDefaultViewParams, ListKeysPerLanguageParams } from '@/shared/types';

/**
 * Query key factory for keys
 * Follows TanStack Query best practices for structured query keys
 */
export const keysKeys = {
  all: ['keys'] as const,
  defaultView: (projectId: string, params: Omit<ListKeysDefaultViewParams, 'project_id'>) =>
    [...keysKeys.defaultViews(projectId), params] as const,
  defaultViews: (projectId: string) => [...keysKeys.all, 'default', projectId] as const,
  detail: (keyId: string) => [...keysKeys.details(), keyId] as const,
  details: () => [...keysKeys.all, 'detail'] as const,
  perLanguageView: (
    projectId: string,
    locale: string,
    params: Omit<ListKeysPerLanguageParams, 'locale' | 'project_id'>
  ) => [...keysKeys.perLanguageViews(projectId, locale), params] as const,
  perLanguageViews: (projectId: string, locale: string) =>
    [...keysKeys.all, 'per-language', projectId, locale] as const,
};
