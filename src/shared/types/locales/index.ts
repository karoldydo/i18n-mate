// Locales Feature Types

import type { Database, Tables, TablesInsert, TablesUpdate } from '../database.types';

// Recommended atomic approach with built-in fan-out verification
export interface CreateProjectLocaleRequest {
  p_label: string;
  p_locale: string;
  p_project_id: string;
}

// RPC function result, uses database generated type
export type CreateProjectLocaleResponse = Database['public']['Functions']['create_project_locale_atomic']['Returns'][0];

// Telemetry event emitted when a new locale is added
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

export interface ListProjectLocalesWithDefaultArgs {
  p_project_id: string;
}

// Branded type for normalized BCP-47 locale codes (ll or ll-CC format)
export type LocaleCode = string & { readonly __brand: 'LocaleCode' };

// Project Locale entity
export type ProjectLocale = Tables<'project_locales'>;

export type ProjectLocaleInsert = TablesInsert<'project_locales'>;

// Standard locale representation
export type ProjectLocaleResponse = ProjectLocale;

export type ProjectLocaleUpdate = TablesUpdate<'project_locales'>;

// Enhanced locale with is_default flag
export type ProjectLocaleWithDefault = ProjectLocaleResponse & {
  is_default: boolean;
};

// Mutation context for optimistic updates when updating a locale
export interface UpdateProjectLocaleContext {
  previousLocales?: ProjectLocaleWithDefault[];
}

// Only label is mutable
export type UpdateProjectLocaleRequest = Pick<ProjectLocaleUpdate, 'label'>;
