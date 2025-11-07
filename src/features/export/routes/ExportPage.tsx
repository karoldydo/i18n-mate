import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { ProjectExportContent } from '../components/views/ProjectExportContent';

interface RouteParams {
  id: string;
}

/**
 * ExportPage - Main page component for project export view
 *
 * Displays project information and provides functionality to export
 * all translations as a ZIP archive containing individual JSON files for each locale.
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
