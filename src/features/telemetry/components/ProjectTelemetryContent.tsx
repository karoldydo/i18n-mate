import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';

import { useProject } from '@/features/projects/api/useProject';
import { useTelemetryEvents } from '@/features/telemetry/api/useTelemetryEvents';
import { Button } from '@/shared/ui/button';

import { useTelemetryPageState } from '../hooks/useTelemetryPageState';
import { TelemetryDataTable } from './TelemetryDataTable';
import { TelemetryKPIs } from './TelemetryKPIs';

interface ProjectTelemetryContentProps {
  projectId: string;
}

/**
 * ProjectTelemetryContent - Suspense-enabled telemetry view for a project
 *
 * Fetches project information and telemetry events using suspense queries,
 * then renders KPIs and the events table with fade-in animation to avoid
 * content blinking during navigation.
 */
export function ProjectTelemetryContent({ projectId }: ProjectTelemetryContentProps) {
  const navigate = useNavigate();
  const pageState = useTelemetryPageState();

  const { data: project } = useProject(projectId);

  const telemetryEventsParams = useMemo(
    () => ({
      limit: pageState.limit,
      offset: pageState.page * pageState.limit,
      order: `${pageState.sortBy}.${pageState.sortOrder}` as 'created_at.asc' | 'created_at.desc',
    }),
    [pageState.limit, pageState.page, pageState.sortBy, pageState.sortOrder]
  );

  const { data: events } = useTelemetryEvents(projectId, telemetryEventsParams);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(events.length / pageState.limit)),
    [events.length, pageState.limit]
  );

  const pagination = useMemo(
    () => ({
      currentPage: pageState.page + 1,
      totalPages,
    }),
    [pageState.page, totalPages]
  );

  const sort = useMemo(
    () => ({
      sortBy: pageState.sortBy,
      sortOrder: pageState.sortOrder,
    }),
    [pageState.sortBy, pageState.sortOrder]
  );

  const handleBackToProject = useCallback(() => {
    navigate(`/projects/${projectId}`);
  }, [navigate, projectId]);

  const handleSortChange = useCallback(
    (sortBy: 'created_at') => {
      pageState.setSortBy(sortBy);
      pageState.resetPagination();
    },
    [pageState]
  );

  if (!project) {
    return null;
  }

  return (
    <div className="animate-in fade-in container mx-auto py-8 duration-500">
      <div className="space-y-6">
        <div>
          <Button
            aria-label="Back to project details"
            className="mb-4"
            onClick={handleBackToProject}
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

        <TelemetryKPIs projectCreatedAt={project.created_at} telemetryEvents={events} />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Telemetry Events</h3>
          <TelemetryDataTable
            events={events}
            onPageChange={pageState.setPage}
            onSortChange={handleSortChange}
            pagination={pagination}
            sort={sort}
          />
        </div>
      </div>
    </div>
  );
}
