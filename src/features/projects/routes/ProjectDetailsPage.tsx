import { Suspense, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ErrorBoundary, Loading } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { UUID_SCHEMA } from '../api/projects.schemas';
import { ProjectDetailsContent } from '../components/views/ProjectDetailsContent';

interface RouteParams {
  id: string;
}

/**
 * ProjectDetailsPage - Main page component for project details view
 *
 * Displays comprehensive project information with navigation to subviews (keys, locales, jobs, telemetry).
 * Supports project management operations (edit, delete) with modal dialogs.
 */
export function ProjectDetailsPage() {
  const { id } = useParams<keyof RouteParams>();
  const navigate = useNavigate();

  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  if (!validation.success) {
    return (
      <div className="container" data-testid="project-details-page">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button
            className="mt-4"
            data-testid="back-to-projects-button-error"
            onClick={handleBackToProjects}
            variant="outline"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="project-details-page">
      <ErrorBoundary resetKeys={[projectId]}>
        <Suspense fallback={<Loading />}>
          <ProjectDetailsContent projectId={projectId} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
