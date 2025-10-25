// Translations Feature Types

import type { Enums, Tables, TablesInsert, TablesUpdate } from '../database.types';

// Translation entity
export type Translation = Tables<'translations'>;

export type TranslationInsert = TablesInsert<'translations'>;

// Standard translation representation
export type TranslationResponse = Translation;

export type TranslationUpdate = TablesUpdate<'translations'>;

export type UpdateSourceType = Enums<'update_source_type'>;

// Context for translation updates
export interface UpdateTranslationParams {
  keyId: string;
  locale: string;
  projectId: string;
  updatedAt?: string; // ISO 8601 timestamp for optimistic locking
}

// Update translation request with all parameters
export interface UpdateTranslationRequest {
  is_machine_translated: boolean;
  key_id: string;
  locale: string;
  project_id: string;
  updated_at?: string;
  updated_by_user_id: null | string;
  updated_source: 'system' | 'user';
  value: null | string;
}
