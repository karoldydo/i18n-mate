// Telemetry Feature Types

import type { Enums, Tables, TablesInsert, TablesUpdate } from '../database.types';
import type { PaginationParams } from '../types';

// Create telemetry event request
export type CreateTelemetryEventRequest = Pick<TelemetryEventInsert, 'event_name' | 'project_id' | 'properties'>;

export type EventType = Enums<'event_type'>;

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

// Telemetry event emitted when a new locale is added
export interface LanguageAddedEvent {
  created_at: string;
  event_name: 'language_added';
  project_id: string;
  properties: LanguageAddedProperties;
}

export interface LanguageAddedProperties {
  is_default?: boolean;
  locale: string;
  locale_count: number;
}

// Query parameters for listing telemetry events
export interface ListTelemetryEventsParams extends PaginationParams {
  order?: 'created_at.asc' | 'created_at.desc';
  project_id: string;
}

// Telemetry event emitted when a new project is created
export interface ProjectCreatedEvent {
  created_at: string;
  event_name: 'project_created';
  project_id: string;
  properties: ProjectCreatedProperties;
}

export interface ProjectCreatedProperties {
  locale_count: number;
}

// Telemetry Event entity
export type TelemetryEvent = Tables<'telemetry_events'>;

export type TelemetryEventInsert = TablesInsert<'telemetry_events'>;

// Typed event-specific data
export type TelemetryEventProperties =
  | KeyCreatedProperties
  | LanguageAddedProperties
  | ProjectCreatedProperties
  | TranslationCompletedProperties;

// Standard event representation
export type TelemetryEventResponse = TelemetryEvent;

export interface TelemetryEventsParams {
  limit?: number;
  offset?: number;
  order?: 'created_at.asc' | 'created_at.desc';
}

// Union type for all telemetry events, used for type-safe event handling
export type TelemetryEventUnion =
  | KeyCreatedEvent
  | LanguageAddedEvent
  | ProjectCreatedEvent
  | TranslationCompletedEvent;

export type TelemetryEventUpdate = TablesUpdate<'telemetry_events'>;

// Telemetry event emitted when an LLM translation job is completed
export interface TranslationCompletedEvent {
  created_at: string;
  event_name: 'translation_completed';
  project_id: string;
  properties: TranslationCompletedProperties;
}

export interface TranslationCompletedProperties {
  completed_keys: number;
  failed_keys: number;
  mode: string; // TranslationMode
  target_locale: string;
}
