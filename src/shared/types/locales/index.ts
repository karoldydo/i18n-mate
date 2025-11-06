import type { Database, Tables } from '../database.types';

export interface CreateLocaleRequest {
  label: string;
  locale: string;
}

export type CreateLocaleResponse = Database['public']['Functions']['create_project_locale_atomic']['Returns'][0];

export interface LanguageAddedEvent {
  created_at: string;
  event_name: 'language_added';
  project_id: string;
  properties: LanguageAddedProperties;
}

export interface LanguageAddedProperties {
  locale: string;
  locale_count: number;
}

export type LocaleCode = string & { readonly __brand: 'LocaleCode' };

export type LocaleItem = LocalesResponse[number];

export type LocalesResponse = Database['public']['Functions']['list_project_locales_with_default']['Returns'];

export interface UpdateLocaleRequest {
  label?: string;
}

export type UpdateLocaleResponse = Tables<'project_locales'>;
