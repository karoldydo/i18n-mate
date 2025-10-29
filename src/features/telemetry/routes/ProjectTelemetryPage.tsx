import { Suspense, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { z } from 'zod';

import { Loading } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { ProjectTelemetryContent } from '../components/ProjectTelemetryContent';

const UUID_SCHEMA = z.string().uuid('Invalid UUID format');

/**
 * ProjectTelemetryPage - Route component for project telemetry view
 *
 * Wraps the telemetry content in a Suspense boundary with a global loader to
 * prevent blinking while data is fetched. Handles invalid route params before
 * rendering the main telemetry content.
 */
export function ProjectTelemetryPage() {
  const { id } = useParams<{ id: string }>();

  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  const handleGoBack = useCallback(() => {
    window.history.back();
  }, []);

  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
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
    <Suspense fallback={<Loading />}>
      <ProjectTelemetryContent projectId={projectId} />
    </Suspense>
  );
}
