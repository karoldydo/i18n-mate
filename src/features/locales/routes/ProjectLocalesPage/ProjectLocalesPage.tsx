import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

import { UUID_SCHEMA } from '../../../projects/api/projects.schemas';
import { ProjectLocalesContent } from '../../components/views/ProjectLocalesContent';

interface RouteParams {
  id: string;
}

/**
 * ProjectLocalesPage
 *
 * Main route component for managing languages (locales) within a project.
 *
 * - Validates the `projectId` route parameter as a UUID.
 * - Displays a list of all locales associated with the specified project.
 * - Enables users to add new languages (with BCP-47 code validation), edit locale display names, and delete locales (excluding the default).
 * - Handles error states and invalid project IDs via `ValidationError`.
 *
 * @returns {JSX.Element} Renders project locales management UI or validation error.
 */
export function ProjectLocalesPage() {
  const { id } = useParams<keyof RouteParams>();

  // validate UUID format
  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  if (!validation.success) {
    return <ValidationError buttonLabel="Back to projects" dataTestId="project-locales-page" to="/projects" />;
  }

  return (
    <ErrorBoundary resetKeys={[projectId]}>
      <ProjectLocalesContent projectId={projectId} />
    </ErrorBoundary>
  );
}
