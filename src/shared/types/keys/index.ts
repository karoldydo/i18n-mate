// Keys Feature Types

import type { Database, Tables, TablesInsert, TablesUpdate } from '../database.types';
import type { PaginatedResponse, PaginationParams } from '../types';

// UI-level request (without RPC parameter prefixes)
export interface CreateKeyRequest {
  default_value: string;
  full_key: string;
  project_id: string;
}

// RPC function result, uses database generated type
export type CreateKeyResponse = Database['public']['Functions']['create_key_with_value']['Returns'][0];

// RPC args for create_key_with_value (with p_ prefixes)
export interface CreateKeyRpcArgs {
  p_default_value: string;
  p_full_key: string;
  p_project_id: string;
}

// Delete uses direct table filter, not RPC
export interface DeleteKeyArgs {
  id: string;
}

// Key entity
export type Key = Tables<'keys'>;

// Telemetry event emitted when a new translation key is added
export interface KeyCreatedEvent {
  created_at: string;
  event_name: 'key_created';
  project_id: string;
  properties: KeyCreatedProperties;
}

export interface KeyCreatedProperties {
  full_key: string;
  key_count: number;
}

// Wrapper responses used by hooks
export type KeyDefaultViewListResponse = PaginatedResponse<KeyDefaultViewResponse>;

// Uses database generated type for type safety
export type KeyDefaultViewResponse = Database['public']['Functions']['list_keys_default_view']['Returns'][0];

// Branded type for key IDs
export type KeyId = string & { readonly __brand: 'KeyId' };

export type KeyInsert = TablesInsert<'keys'>;

export type KeyPerLanguageViewListResponse = PaginatedResponse<KeyPerLanguageViewResponse>;

// Uses database generated composite type
export type KeyPerLanguageViewResponse = Database['public']['CompositeTypes']['key_per_language_view_type'];

// Standard key representation
export type KeyResponse = Key;

export type KeyUpdate = TablesUpdate<'keys'>;

export interface ListKeysDefaultViewArgs {
  limit?: null | number;
  missing_only?: boolean | null;
  offset?: null | number;
  project_id: string;
  search?: null | string;
}

// Query parameters used by keys list views
export interface ListKeysDefaultViewParams extends PaginationParams {
  missing_only?: boolean;
  project_id: string;
  search?: string;
}

export interface ListKeysDefaultViewRpcArgs {
  p_limit?: number;
  p_missing_only?: boolean;
  p_offset?: number;
  p_project_id: string;
  p_search?: string;
}

// List keys per language query parameters
export interface ListKeysPerLanguageParams extends ListKeysDefaultViewParams {
  locale: string;
}

export interface ListKeysPerLanguageViewArgs {
  limit?: null | number;
  locale: string;
  missing_only?: boolean | null;
  offset?: null | number;
  project_id: string;
  search?: null | string;
}

export interface ListKeysPerLanguageViewRpcArgs {
  p_limit?: number;
  p_locale: string;
  p_missing_only?: boolean;
  p_offset?: number;
  p_project_id: string;
  p_search?: string;
}
