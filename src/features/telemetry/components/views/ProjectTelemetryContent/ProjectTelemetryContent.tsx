import { useCallback, useMemo } from 'react';

import type { PaginationParams } from '@/shared/types';

import { useProject } from '@/features/projects/api/useProject';
import { useTelemetryEvents } from '@/features/telemetry/api/useTelemetryEvents';
import { BackButton } from '@/shared/components/BackButton';
import { CardList } from '@/shared/components/CardList';
import { PageHeader } from '@/shared/components/PageHeader';

import { useTelemetryPageState } from '../../../hooks/useTelemetryPageState';
import { TelemetryCard } from '../../cards/TelemetryCard';
import { TelemetryKPIs } from '../../common/TelemetryKPIs';

interface ProjectTelemetryContentProps {
  projectId: string;
}

/**
 * Displays telemetry analytics and event logs for a specific project
 *
 * This suspense-enabled view fetches and displays project metadata and
 * telemetry events, including usage statistics and paginated event details.
 * Animates entry for a smoother navigation experience and minimizes UI blinking.
 *
 * Data flow:
 * - Loads project details using suspense via useProject
 * - Loads paginated telemetry events with useTelemetryEvents
 * - KPIs and events are rendered with accessible, styled components
 * - Pagination logic is converted from page/limit to offset-based for API compatibility
 *
 * @param {ProjectTelemetryContentProps} props - The component props
 * @param {string} props.projectId - The ID of the project to load telemetry for
 *
 * @returns {JSX.Element | null} The rendered telemetry view, or null if project not found
 */
export function ProjectTelemetryContent({ projectId }: ProjectTelemetryContentProps) {
  const pageState = useTelemetryPageState();

  const { data: project } = useProject(projectId);

  const telemetryEventsParams = useMemo(
    () => ({
      limit: pageState.limit,
      offset: pageState.page * pageState.limit,
      order: 'created_at.desc' as const,
    }),
    [pageState.limit, pageState.page]
  );

  const { data: telemetries } = useTelemetryEvents(projectId, telemetryEventsParams);

  // convert page-based pagination to offset-based for CardList
  const paginationParams = useMemo<PaginationParams>(
    () => ({
      limit: pageState.limit,
      offset: pageState.page * pageState.limit,
    }),
    [pageState.limit, pageState.page]
  );

  const handlePageChange = useCallback(
    (params: PaginationParams) => {
      const limit = params.limit ?? pageState.limit;
      const newPage = limit > 0 ? Math.floor((params.offset ?? 0) / limit) : 0;
      pageState.setPage(newPage);
    },
    [pageState]
  );

  if (!project) {
    return null;
  }

  return (
    <div className="animate-in fade-in container duration-500">
      <div className="space-y-6">
        <BackButton ariaLabel="Back to project details" buttonLabel="Back to project" to={`/projects/${projectId}`} />
        <PageHeader
          header="Analytics & Insights"
          subHeading={`Monitor usage patterns, track activity, and analyze translation performance for ${project.name}`}
        />
        <TelemetryKPIs projectCreatedAt={project.created_at} telemetryEvents={telemetries.data} />
        <CardList
          data-testid="telemetry-events-list"
          pagination={
            telemetries.data.length > 0
              ? {
                  metadata: telemetries.metadata,
                  onPageChange: handlePageChange,
                  params: paginationParams,
                }
              : undefined
          }
        >
          {telemetries.data.map((event) => (
            <TelemetryCard event={event} key={event.id} />
          ))}
        </CardList>
      </div>
    </div>
  );
}
