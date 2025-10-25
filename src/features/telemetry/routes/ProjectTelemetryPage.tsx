import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';

import { useProject } from '@/features/projects/api/useProject';
import { useTelemetryEvents } from '@/features/telemetry/api/useTelemetryEvents';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

import { TelemetryDataTable } from '../components/TelemetryDataTable';
import { TelemetryKPIs } from '../components/TelemetryKPIs';
import { useTelemetryPageState } from '../hooks/useTelemetryPageState';

const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

/**
 * ProjectTelemetryPage - Main page component for project telemetry view
 *
 * Displays telemetry events and KPIs for a specific project. Shows usage statistics
 * and analytics through telemetry events and key performance indicators.
 */
export function ProjectTelemetryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // validate UUID format
  const validation = UUID_SCHEMA.safeParse(id);
  const projectId = validation.data ?? '';

  // Fetch project details
  const {
    data: project,
    error: projectError,
    isError: isProjectError,
    isLoading: isProjectLoading,
  } = useProject(projectId);

  // Local UI state for pagination and sorting
  const pageState = useTelemetryPageState();

  // Fetch telemetry events with pagination and sorting
  const {
    data: eventsData,
    error: eventsError,
    isError: isEventsError,
    isLoading: isEventsLoading,
  } = useTelemetryEvents(projectId, {
    limit: pageState.limit,
    offset: pageState.page * pageState.limit,
    order: `${pageState.sortBy}.${pageState.sortOrder}` as 'created_at.asc' | 'created_at.desc',
  });

  // Handle invalid project ID
  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Loading state for project
  if (isProjectLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Error state for project
  if (isProjectError || !project) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Project</h2>
          <p className="text-muted-foreground text-sm">
            {projectError?.error?.message || 'Failed to load project details.'}
          </p>
          <Button className="mt-4" onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Calculate total pages (assuming we need to estimate since the API doesn't return total count)
  // In a real implementation, the API would return total count
  const totalPages = Math.ceil((eventsData?.length || 0) / pageState.limit) || 1;

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <Button
            aria-label="Back to project details"
            className="mb-4"
            onClick={() => navigate(`/projects/${projectId}`)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Telemetry</h1>
            <p className="text-muted-foreground">View usage statistics and analytics for {project.name}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <TelemetryKPIs projectCreatedAt={project.created_at} telemetryEvents={eventsData || []} />

        {/* Events Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Telemetry Events</h3>
          <TelemetryDataTable
            events={eventsData || []}
            isLoading={isEventsLoading}
            onPageChange={pageState.setPage}
            onSortChange={(sortBy) => {
              pageState.setSortBy(sortBy);
              // Reset to first page when sorting changes
              pageState.resetPagination();
            }}
            pagination={{
              currentPage: pageState.page + 1, // Convert 0-based to 1-based
              totalPages,
            }}
            sort={{
              sortBy: pageState.sortBy,
              sortOrder: pageState.sortOrder,
            }}
          />
        </div>

        {/* Error state for events */}
        {isEventsError && (
          <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
            <h2 className="text-destructive text-lg font-semibold">Error Loading Events</h2>
            <p className="text-muted-foreground text-sm">
              {eventsError?.error?.message || 'Failed to load telemetry events.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
