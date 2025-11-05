import { Suspense, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ErrorBoundary, Loading } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { ProjectLocalesContent } from '../components/views/ProjectLocalesContent';

interface RouteParams {
  id: string;
}

/**
 * ProjectLocalesPage - Main route component for project languages list view
 *
 * Provides comprehensive interface for managing languages assigned to a specific project.
 * Allows users to view all project locales, add new languages with BCP-47 validation,
 * update language labels, and delete languages (except the default).
 *
 * Route: /projects/:projectId/locales
 */
export function ProjectLocalesPage() {
  const { id } = useParams<keyof RouteParams>();
  const navigate = useNavigate();

  // validate UUID format
  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  // invalid project ID
  if (!validation.success) {
    return (
      <div className="container">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={handleBackToProjects} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary resetKeys={[projectId]}>
      <Suspense fallback={<Loading />}>
        <ProjectLocalesContent projectId={projectId} />
      </Suspense>
    </ErrorBoundary>
  );
}
