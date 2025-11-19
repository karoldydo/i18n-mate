import { useMemo } from 'react';

import type { TelemetryEventResponse } from '@/shared/types';

import { CardItem } from '@/shared/components';
import { Badge } from '@/shared/ui/badge';
import { formatRelativeTimestamp } from '@/shared/utils';

interface TelemetryCardProps {
  event: TelemetryEventResponse;
}

/**
 * TelemetryCard component
 *
 * Renders a single telemetry event in a modern card layout. Displays the event timestamp (relative),
 * an event type badge, and any additional event properties in formatted JSON.
 *
 * Typically used to summarize a single telemetry event as part of a list or feed.
 *
 * @param {TelemetryCardProps} props - Component props
 * @param {TelemetryEventResponse} props.event - Telemetry event object with timestamp, event type, and properties
 *
 * @returns {JSX.Element} CardItem containing the formatted telemetry event data
 */
export function TelemetryCard({ event }: TelemetryCardProps) {
  const formattedRelativeTimestamp = useMemo(() => formatRelativeTimestamp(event.created_at), [event.created_at]);
  const eventTypeLabel = useMemo(() => getEventTypeLabel(event.event_name), [event.event_name]);
  const eventTypeVariant = useMemo(() => getEventTypeVariant(event.event_name), [event.event_name]);
  const formattedJson = useMemo(() => {
    if (!event.properties) return null;
    try {
      return JSON.stringify(event.properties, null, 2);
    } catch {
      return String(event.properties);
    }
  }, [event.properties]);

  return (
    <CardItem data-testid={`telemetry-event-${event.id}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* left side: badge + timestamp */}
        <div className="flex items-center justify-between sm:justify-start sm:gap-3">
          <span className="text-muted-foreground text-xs sm:text-sm" data-testid={`telemetry-timestamp-${event.id}`}>
            {formattedRelativeTimestamp}
          </span>
          <Badge variant={eventTypeVariant}>{eventTypeLabel}</Badge>
        </div>

        {/* right side: json properties */}
        {formattedJson && (
          <code
            className="bg-muted max-w-full rounded px-2 py-1 text-[10px] whitespace-break-spaces sm:overflow-x-auto sm:text-xs sm:whitespace-normal"
            data-testid={`telemetry-properties-${event.id}`}
          >
            {formattedJson}
          </code>
        )}
      </div>
    </CardItem>
  );
}

/**
 * Get human-readable label for event type
 *
 * @param {string} eventName - Event type name (e.g., 'key_created', 'language_added')
 *
 * @returns {string} Human-readable label for the event type
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
 *
 * @param {string} eventName - Event type name (e.g., 'key_created', 'language_added')
 *
 * @returns {'default' | 'destructive' | 'outline' | 'secondary'} Badge variant for the event type
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
