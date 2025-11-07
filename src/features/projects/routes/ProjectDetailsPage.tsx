import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

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

  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  if (!validation.success) {
    return <ValidationError buttonLabel="Back to projects" dataTestId="project-details-page" to="/projects" />;
  }

  return (
    <div data-testid="project-details-page">
      <ErrorBoundary resetKeys={[projectId]}>
        <ProjectDetailsContent projectId={projectId} />
      </ErrorBoundary>
    </div>
  );
}
