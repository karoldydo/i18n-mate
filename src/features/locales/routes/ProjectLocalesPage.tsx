import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

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
