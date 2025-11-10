import type { Database, Enums, Json, Tables } from '../database.types';
import type { PaginatedResponse } from '../types';

export interface CreateTelemetryEventRequest {
  event_name: Enums<'event_type'>;
  project_id: string;
  properties?: Json | null;
}

export type EventType = Enums<'event_type'>;
export interface KeyCreatedProperties {
  full_key: string;
  key_count: number;
}

export interface LanguageAddedProperties {
  is_default?: boolean;
  locale: string;
  locale_count: number;
}

export interface ProjectCreatedProperties {
  locale_count: number;
}

export type TelemetryEventProperties =
  | KeyCreatedProperties
  | LanguageAddedProperties
  | ProjectCreatedProperties
  | TranslationCompletedProperties;

export type TelemetryEventResponse = Tables<'telemetry_events'>;

export interface TelemetryEventsRequest {
  limit?: number;
  offset?: number;
  order?: 'created_at.asc' | 'created_at.desc';
  project_id: string;
}

export type TelemetryEventsResponse = PaginatedResponse<TelemetryEventsResponseItem>;

export type TelemetryEventsResponseItem =
  Database['public']['Functions']['list_telemetry_events_with_count']['Returns'][0];

export interface TranslationCompletedProperties {
  completed_keys: number;
  failed_keys: number;
  mode: string;
  target_locale: string;
}
