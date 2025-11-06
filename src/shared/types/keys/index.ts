import type { Database } from '../database.types';
import type { PaginatedResponse } from '../types';

export interface CreateKeyRequest {
  default_value: string;
  full_key: string;
  project_id: string;
}

export type CreateKeyResponse = Database['public']['Functions']['create_key_with_value']['Returns'][0];

export type CreateKeyRpcArgs = Database['public']['Functions']['create_key_with_value']['Args'];

export type KeyCountResponse = number;

export type KeyDefaultViewItem = Database['public']['Functions']['list_keys_default_view']['Returns'][0];

export type KeysRequest = Omit<
  Database['public']['Functions']['list_keys_default_view']['Args'],
  'p_limit' | 'p_missing_only' | 'p_offset' | 'p_project_id' | 'p_search'
> & {
  limit?: number;
  missing_only?: boolean;
  offset?: number;
  project_id: string;
  search?: string;
};

export type KeysResponse = PaginatedResponse<KeyDefaultViewItem>;

export type KeyTranslationItem = Database['public']['CompositeTypes']['key_per_language_view_type'];

export type KeyTranslationsRequest = Omit<
  Database['public']['Functions']['list_keys_per_language_view']['Args'],
  'p_limit' | 'p_locale' | 'p_missing_only' | 'p_offset' | 'p_project_id' | 'p_search'
> & {
  limit?: number;
  locale: string;
  missing_only?: boolean;
  offset?: number;
  project_id: string;
  search?: string;
};

export type KeyTranslationsResponse = PaginatedResponse<KeyTranslationItem>;
