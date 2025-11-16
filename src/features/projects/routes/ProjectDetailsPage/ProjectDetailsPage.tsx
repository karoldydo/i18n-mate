import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

import { UUID_SCHEMA } from '../../api/projects.schemas';
import { ProjectDetailsContent } from '../../components/views/ProjectDetailsContent/ProjectDetailsContent';

interface RouteParams {
  id: string;
}

/**
 * Displays the details view for a single project, validating the route ID.
 *
 * - Extracts and validates the project ID from the route parameters using the project's UUID schema.
 * - On invalid ID, renders a friendly <ValidationError> with navigation back to the projects list.
 * - On valid ID, renders the <ProjectDetailsContent> within an <ErrorBoundary> to gracefully handle loading and runtime errors.
 * - Error boundary is reset if the project ID changes, ensuring clean error state per project.
 *
 * @returns {JSX.Element} Detailed view for the selected project, or an error message if the project ID is invalid.
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
