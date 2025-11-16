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
 * According to PRD, KPIs are measured after a cohort period (default 7 days) from project creation.
 * Events outside the cohort window are filtered out before calculations.
 *
 * @param events - Array of telemetry events for the project
 * @param projectCreatedAt - ISO date string when the project was created
 * @param cohortDays - Number of days after project creation to measure KPIs (default: 7)
 * @returns Calculated KPI metrics
 */
export function useTelemetryKPIs(
  events: TelemetryEventResponse[],
  projectCreatedAt: string,
  cohortDays = 7
): TelemetryKPIsViewModel {
  return useMemo(() => calculateKPIs(events, projectCreatedAt, cohortDays), [events, projectCreatedAt, cohortDays]);
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
 *
 * Filters events to only include those within the cohort window (projectCreatedAt + cohortDays).
 * This aligns with PRD requirement: "KPI after 7 days from project creation".
 *
 * @param events - All telemetry events for the project
 * @param projectCreatedAt - ISO date string when the project was created
 * @param cohortDays - Number of days after project creation to measure KPIs
 * @returns Calculated KPI metrics based on events within cohort window
 */
function calculateKPIs(
  events: TelemetryEventResponse[],
  projectCreatedAt: string,
  cohortDays: number
): TelemetryKPIsViewModel {
  if (events.length === 0) {
    return {
      averageKeysPerLanguage: 0,
      llmTranslationsPercentage: 0,
      multiLanguageProjectsPercentage: 0,
    };
  }

  // Calculate cohort window end date
  const cohortEndDate = new Date(projectCreatedAt);
  cohortEndDate.setDate(cohortEndDate.getDate() + cohortDays);
  const cohortEndTime = cohortEndDate.getTime();

  // Filter events to only include those within the cohort window
  const cohortEvents = events.filter((event) => {
    const eventTime = new Date(event.created_at).getTime();
    return eventTime <= cohortEndTime;
  });

  // If no events within cohort window, return zeros
  if (cohortEvents.length === 0) {
    return {
      averageKeysPerLanguage: 0,
      llmTranslationsPercentage: 0,
      multiLanguageProjectsPercentage: 0,
    };
  }

  // Calculate multi-language usage percentage (use original events for time-based calculation)
  const multiLanguagePercentage = calculateMultiLanguagePercentage(cohortEvents, projectCreatedAt);

  // Calculate average keys per language
  const averageKeysPerLanguage = calculateAverageKeysPerLanguage(cohortEvents);

  // Calculate LLM translations percentage
  const llmTranslationsPercentage = calculateLLMTranslationsPercentage(cohortEvents);

  return {
    averageKeysPerLanguage,
    llmTranslationsPercentage: Math.round(llmTranslationsPercentage),
    multiLanguageProjectsPercentage: Math.round(multiLanguagePercentage),
  };
}

/**
 * Calculate percentage of translations completed via LLM
 *
 * All translation_completed events are from LLM (OpenRouter.ai).
 * This KPI measures: (LLM translated keys) / (total possible translations) * 100
 * where total possible translations = keyCount * (localeCount - 1)
 * excluding the default locale which doesn't need translation from itself.
 */
function calculateLLMTranslationsPercentage(events: TelemetryEventResponse[]): number {
  const translationEvents = events.filter((event) => event.event_name === 'translation_completed');

  if (translationEvents.length === 0) return 0;

  // Sum all completed_keys from translation_completed events (all are LLM translations)
  const llmTranslatedKeys = translationEvents.reduce((sum, event) => {
    const completedKeys = Number(getPropertyValue(event.properties, 'completed_keys')) || 0;
    return sum + completedKeys;
  }, 0);

  // Get total number of keys and locales to calculate total possible translations
  const latestKeyEvent = events
    .filter((event) => event.event_name === 'key_created')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const latestLanguageEvent = events
    .filter((event) => event.event_name === 'language_added' || event.event_name === 'project_created')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const keyCount = Number(getPropertyValue(latestKeyEvent?.properties, 'key_count')) || 0;
  const localeCount = Math.max(Number(getPropertyValue(latestLanguageEvent?.properties, 'locale_count')) || 1, 1);

  // Total possible translations = keys * (locales - 1), excluding default locale
  const totalPossibleTranslations = keyCount * Math.max(localeCount - 1, 0);

  return totalPossibleTranslations > 0 ? (llmTranslatedKeys / totalPossibleTranslations) * 100 : 0;
}

/**
 * Calculate the percentage of time the project has had multiple languages
 *
 * According to PRD, projects always have at least 1 language (default locale cannot be deleted).
 * Once a project becomes multi-language (2+ locales), it stays multi-language.
 * This function finds when the project first reached 2+ languages and calculates
 * the percentage of time since then.
 */
function calculateMultiLanguagePercentage(events: TelemetryEventResponse[], projectCreatedAt: string): number {
  const projectStart = new Date(projectCreatedAt).getTime();
  const now = Date.now();

  if (now <= projectStart) return 0;

  const totalDuration = now - projectStart;

  // Find all language-related events sorted chronologically
  const languageEvents = events
    .filter((event) => event.event_name === 'language_added' || event.event_name === 'project_created')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Find the first event where locale_count >= 2 (project became multi-language)
  const firstMultiLanguageEvent = languageEvents.find((event) => {
    const localeCount = Number(getPropertyValue(event.properties, 'locale_count')) || 1;
    return localeCount >= 2;
  });

  // If project never became multi-language, return 0%
  if (!firstMultiLanguageEvent) return 0;

  // Calculate duration from when project became multi-language to now
  const multiLanguageStart = new Date(firstMultiLanguageEvent.created_at).getTime();
  const multiLanguageDuration = now - multiLanguageStart;

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
