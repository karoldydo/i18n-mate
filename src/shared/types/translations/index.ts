import type { Tables } from '../database.types';

export type TranslationResponse = Tables<'translations'>;

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
