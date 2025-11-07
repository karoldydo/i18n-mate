import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

import { UUID_SCHEMA } from '../api';
import { ProjectTelemetryContent } from '../components/views/ProjectTelemetryContent';

interface RouteParams {
  id: string;
}

/**
 * ProjectTelemetryPage - Route component for project telemetry view
 *
 * Displays telemetry data for a specific project. Handles invalid route params
 * before rendering the main telemetry content. Loading states are managed by
 * TanStack Query within the content component.
 */
export function ProjectTelemetryPage() {
  const { id } = useParams<keyof RouteParams>();

  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  const handleGoBack = useCallback(() => {
    window.history.back();
  }, []);

  if (!validation.success) {
    return <ValidationError buttonLabel="Go back" dataTestId="project-telemetry-page" onClick={handleGoBack} />;
  }

  return (
    <ErrorBoundary resetKeys={[projectId]}>
      <ProjectTelemetryContent projectId={projectId} />
    </ErrorBoundary>
  );
}
