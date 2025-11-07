import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ErrorBoundary } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { UUID_SCHEMA } from '../api/projects.schemas';
import { ProjectDetailsContent } from '../components/views/ProjectDetailsContent';

interface RouteParams {
  id: string;
}

/**
 * ProjectDetailsPage – Main route/page component for displaying a project's details.
 *
 * Handles the following functionality:
 * - Validates the project ID from the route parameter; displays an error if invalid.
 * - Renders the full project details using the <ProjectDetailsContent> component.
 * - Wraps the content in an <ErrorBoundary> to catch and display errors gracefully.
 * - Provides navigation back to the project list on invalid ID or user action.
 *
 * @returns {JSX.Element} Project details view or error message for invalid project ID.
 *
 * @example
 * // Usage in a React Router route:
 * <Route path="/projects/:id" element={<ProjectDetailsPage />} />
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
        <ProjectDetailsContent projectId={projectId} />
      </ErrorBoundary>
    </div>
  );
}
