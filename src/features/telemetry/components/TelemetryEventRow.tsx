import type { Json, TelemetryEventResponse } from '@/shared/types';

import { Badge } from '@/shared/ui/badge';
import { TableCell, TableRow } from '@/shared/ui/table';

/**
 * TelemetryEventRow - Individual table row component for displaying formatted telemetry events
 *
 * Displays a single telemetry event with timestamp, event type badge, and human-readable properties.
 */
export function TelemetryEventRow({ event }: { event: TelemetryEventResponse }) {
  const formattedTimestamp = formatTimestamp(event.created_at);
  const eventTypeLabel = getEventTypeLabel(event.event_name);
  const formattedProperties = formatEventProperties(event.properties);

  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-sm">{formattedTimestamp}</TableCell>
      <TableCell>
        <Badge variant={getEventTypeVariant(event.event_name)}>{eventTypeLabel}</Badge>
      </TableCell>
      <TableCell className="text-sm">{formattedProperties}</TableCell>
    </TableRow>
  );
}

/**
 * Format event properties to human-readable text
 */
function formatEventProperties(properties: Json | null): string {
  if (!properties) return '';

  try {
    // Handle different event types
    if (typeof properties === 'object') {
      const entries = Object.entries(properties);
      if (entries.length === 0) return '';

      return entries
        .map(([key, value]) => {
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          const formattedValue = formatPropertyValue(key, value ?? null);
          return `${formattedKey}: ${formattedValue}`;
        })
        .join(', ');
    }

    return String(properties);
  } catch {
    return 'Unable to format properties';
  }
}

/**
 * Format individual property values
 */
function formatPropertyValue(key: string, value: Json | null): string {
  if (value === null || value === undefined) return 'N/A';

  switch (key) {
    case 'completed_keys':
    case 'failed_keys':
    case 'key_count':
    case 'locale_count':
      return String(value);
    case 'full_key':
      return `"${String(value)}"`;
    case 'locale':
    case 'mode':
    case 'target_locale':
      return typeof value === 'string' ? value.toUpperCase() : String(value);
    default:
      return String(value);
  }
}

/**
 * Format timestamp to a human-readable format
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    // Show relative time for recent events
    const diffInMinutes = Math.floor(diffInHours * 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    return `${Math.floor(diffInHours)}h ago`;
  }

  // Show date for older events
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get human-readable label for event type
 */
function getEventTypeLabel(eventName: string): string {
  switch (eventName) {
    case 'key_created':
      return 'Key Created';
    case 'language_added':
      return 'Language Added';
    case 'project_created':
      return 'Project Created';
    case 'translation_completed':
      return 'Translation Completed';
    default:
      return eventName.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

/**
 * Get appropriate badge variant for event type
 */
function getEventTypeVariant(eventName: string): 'default' | 'destructive' | 'outline' | 'secondary' {
  switch (eventName) {
    case 'key_created':
      return 'outline';
    case 'language_added':
      return 'secondary';
    case 'project_created':
      return 'default';
    case 'translation_completed':
      return 'secondary';
    default:
      return 'outline';
  }
}
