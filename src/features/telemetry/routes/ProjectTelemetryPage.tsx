import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary } from '@/shared/components';
import { Button } from '@/shared/ui/button';

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
    return (
      <div className="container">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={handleGoBack} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary resetKeys={[projectId]}>
      <ProjectTelemetryContent projectId={projectId} />
    </ErrorBoundary>
  );
}
