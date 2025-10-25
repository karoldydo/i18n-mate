import { useMemo } from 'react';

import type { Json, TelemetryEventResponse } from '@/shared/types';

export interface TelemetryKPIsViewModel {
  averageKeysPerLanguage: number;
  llmTranslationsPercentage: number;
  multiLanguageProjectsPercentage: number;
}

/**
 * useTelemetryKPIs - Hook for calculating telemetry KPIs from events
 *
 * Performs client-side calculations of key performance indicators from telemetry events.
 * Memoizes results to avoid recalculation on every render.
 *
 * @param events - Array of telemetry events for the project
 * @param projectCreatedAt - ISO date string when the project was created
 * @returns Calculated KPI metrics
 */
export function useTelemetryKPIs(events: TelemetryEventResponse[], projectCreatedAt: string): TelemetryKPIsViewModel {
  return useMemo(() => calculateKPIs(events, projectCreatedAt), [events, projectCreatedAt]);
}

/**
 * Calculate average keys per language
 */
function calculateAverageKeysPerLanguage(events: TelemetryEventResponse[]): number {
  // Find the latest key count and locale count
  const latestKeyEvent = events
    .filter((event) => event.event_name === 'key_created')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const latestLanguageEvent = events
    .filter((event) => event.event_name === 'language_added' || event.event_name === 'project_created')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const keyCount = Number(getPropertyValue(latestKeyEvent?.properties, 'key_count')) || 0;
  const localeCount = Math.max(Number(getPropertyValue(latestLanguageEvent?.properties, 'locale_count')) || 1, 1);

  return localeCount > 0 ? keyCount / localeCount : 0;
}

/**
 * Calculate KPIs from telemetry events and project creation date
 */
function calculateKPIs(events: TelemetryEventResponse[], projectCreatedAt: string): TelemetryKPIsViewModel {
  if (events.length === 0) {
    return {
      averageKeysPerLanguage: 0,
      llmTranslationsPercentage: 0,
      multiLanguageProjectsPercentage: 0,
    };
  }

  // Calculate multi-language usage percentage
  const multiLanguagePercentage = calculateMultiLanguagePercentage(events, projectCreatedAt);

  // Calculate average keys per language
  const averageKeysPerLanguage = calculateAverageKeysPerLanguage(events);

  // Calculate LLM translations percentage
  const llmTranslationsPercentage = calculateLLMTranslationsPercentage(events);

  return {
    averageKeysPerLanguage,
    llmTranslationsPercentage: Math.round(llmTranslationsPercentage),
    multiLanguageProjectsPercentage: Math.round(multiLanguagePercentage),
  };
}

/**
 * Calculate percentage of translations completed via LLM
 */
function calculateLLMTranslationsPercentage(events: TelemetryEventResponse[]): number {
  const translationEvents = events.filter((event) => event.event_name === 'translation_completed');

  if (translationEvents.length === 0) return 0;

  let totalKeys = 0;
  let llmKeys = 0;

  for (const event of translationEvents) {
    const completedKeys = Number(getPropertyValue(event.properties, 'completed_keys')) || 0;
    const mode = String(getPropertyValue(event.properties, 'mode') || '');

    totalKeys += completedKeys;

    // Assume 'llm' or 'ai' modes indicate LLM translations
    if (mode.toLowerCase().includes('llm') || mode.toLowerCase().includes('ai')) {
      llmKeys += completedKeys;
    }
  }

  return totalKeys > 0 ? (llmKeys / totalKeys) * 100 : 0;
}

/**
 * Calculate the percentage of time the project has had multiple languages
 */
function calculateMultiLanguagePercentage(events: TelemetryEventResponse[], projectCreatedAt: string): number {
  const projectStart = new Date(projectCreatedAt).getTime();
  const now = Date.now();

  if (now <= projectStart) return 0;

  const totalDuration = now - projectStart;

  // Find periods when project had multiple languages
  const languageEvents = events
    .filter((event) => event.event_name === 'language_added' || event.event_name === 'project_created')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let multiLanguageDuration = 0;
  let lastMultiLanguageStart = 0;

  for (const event of languageEvents) {
    const eventTime = new Date(event.created_at).getTime();
    const localeCount = Number(getPropertyValue(event.properties, 'locale_count')) || 1;

    if (localeCount > 1) {
      // Project became multi-language
      if (lastMultiLanguageStart === 0) {
        lastMultiLanguageStart = eventTime;
      }
    } else {
      // Project became single-language
      if (lastMultiLanguageStart > 0) {
        multiLanguageDuration += eventTime - lastMultiLanguageStart;
        lastMultiLanguageStart = 0;
      }
    }
  }

  // If still multi-language, add time from last event to now
  if (lastMultiLanguageStart > 0) {
    multiLanguageDuration += now - lastMultiLanguageStart;
  }

  return totalDuration > 0 ? (multiLanguageDuration / totalDuration) * 100 : 0;
}

/**
 * Safely extract a property from telemetry event properties
 */
function getPropertyValue(properties: Json | null, key: string): Json | undefined {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return undefined;
  }
  return (properties as Record<string, Json>)[key];
}
