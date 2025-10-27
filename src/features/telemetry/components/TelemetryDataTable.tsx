import { ArrowDown, ArrowUp } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import type { TelemetryEventResponse } from '@/shared/types';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { TelemetryEventRow } from './TelemetryEventRow';
import { TelemetryTablePagination } from './TelemetryTablePagination';

export interface TelemetryPageState {
  limit: number;
  page: number;
  sortBy: 'created_at';
  sortOrder: 'asc' | 'desc';
}

interface SortIconProps {
  sortOrder: 'asc' | 'desc';
}

interface TelemetryDataTableProps {
  events: TelemetryEventResponse[];
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: 'created_at') => void;
  pagination: {
    currentPage: number;
    totalPages: number;
  };
  sort: {
    sortBy: 'created_at';
    sortOrder: 'asc' | 'desc';
  };
}

/**
 * TelemetryDataTable - Data table displaying telemetry events with pagination and sorting
 *
 * Renders a table with columns for timestamp, event type, and formatted properties.
 * Supports sorting by timestamp and pagination navigation.
 */
export function TelemetryDataTable({
  events,
  isLoading,
  onPageChange,
  onSortChange,
  pagination,
  sort,
}: TelemetryDataTableProps) {
  const hasEvents = useMemo(() => !isLoading && events.length === 0, [isLoading, events.length]);
  const showPagination = useMemo(() => pagination.totalPages > 1, [pagination.totalPages]);

  const handleSortClick = useCallback(() => {
    onSortChange('created_at');
  }, [onSortChange]);

  if (hasEvents) {
    return (
      <div className="border-border rounded-lg border p-12 text-center">
        <p className="text-muted-foreground text-lg">No telemetry events found</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Events will appear here as your project is used for translations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hover:bg-muted/50 w-[25%] cursor-pointer select-none" onClick={handleSortClick}>
                <div className="flex items-center gap-2">
                  Timestamp
                  <SortIcon sortOrder={sort.sortOrder} />
                </div>
              </TableHead>
              <TableHead className="w-[20%]">Event Type</TableHead>
              <TableHead className="w-[55%]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TelemetryEventRow event={event} key={event.id} />
            ))}
          </TableBody>
        </Table>
      </div>
      {showPagination && (
        <TelemetryTablePagination
          currentPage={pagination.currentPage}
          onPageChange={onPageChange}
          totalPages={pagination.totalPages}
        />
      )}
    </div>
  );
}

function SortIcon({ sortOrder }: SortIconProps) {
  const IconComponent = sortOrder === 'asc' ? ArrowUp : ArrowDown;
  return <IconComponent className="text-muted-foreground h-4 w-4" />;
}
