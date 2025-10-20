import type { ListKeysDefaultViewParams, ListKeysPerLanguageParams } from '@/shared/types';

// query key factory for keys, follows tanstack query best practices for structured query keys
export const KEYS_KEY_FACTORY = {
  all: ['keys'] as const,
  defaultView: (projectId: string, params: Omit<ListKeysDefaultViewParams, 'project_id'>) =>
    [...KEYS_KEY_FACTORY.defaultViews(projectId), params] as const,
  defaultViews: (projectId: string) => [...KEYS_KEY_FACTORY.all, 'default', projectId] as const,
  detail: (keyId: string) => [...KEYS_KEY_FACTORY.details(), keyId] as const,
  details: () => [...KEYS_KEY_FACTORY.all, 'detail'] as const,
  perLanguageView: (
    projectId: string,
    locale: string,
    params: Omit<ListKeysPerLanguageParams, 'locale' | 'project_id'>
  ) => [...KEYS_KEY_FACTORY.perLanguageViews(projectId, locale), params] as const,
  perLanguageViews: (projectId: string, locale: string) =>
    [...KEYS_KEY_FACTORY.all, 'per-language', projectId, locale] as const,
};
