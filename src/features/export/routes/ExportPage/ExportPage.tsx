import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ValidationError } from '@/shared/components/ValidationError';

import { UUID_SCHEMA } from '../../../projects/api/projects.schemas';
import { ProjectExportContent } from '../../components/views/ProjectExportContent';

interface RouteParams {
  id: string;
}

/**
 * ExportPage - Main route component for exporting translations of a specific project.
 *
 * Validates the `projectId` route parameter as a UUID before initiating export logic.
 * If validation fails, renders a `ValidationError` with a back navigation button.
 * Delegates loading and export rendering to `ProjectExportContent`, which surfaces
 * project info and enables export as a ZIP archive (one JSON file per locale).
 * Wraps content in an `ErrorBoundary` that resets on `projectId` to gracefully
 * handle rendering or export errors.
 *
 * @returns {JSX.Element} The export UI or validation error view
 *
 * @see {@link ProjectExportContent} for the main export content component
 * @see {@link UUID_SCHEMA} for route parameter validation
 */
export function ExportPage() {
  const { id } = useParams<keyof RouteParams>();

  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  if (!validation.success) {
    return <ValidationError buttonLabel="Back to projects" dataTestId="export-page" to="/projects" />;
  }

  return (
    <ErrorBoundary resetKeys={[projectId]}>
      <ProjectExportContent projectId={projectId} />
    </ErrorBoundary>
  );
}
