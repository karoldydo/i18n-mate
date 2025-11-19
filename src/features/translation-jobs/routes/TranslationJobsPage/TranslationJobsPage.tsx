import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ValidationError } from '@/shared/components/ValidationError';

import { UUID_SCHEMA } from '../../../projects/api/projects.schemas';
import { TranslationJobsContent } from '../../components/views/TranslationJobsContent';

interface RouteParams {
  id: string;
}

/**
 * TranslationJobsPage
 *
 * Main route component for managing translation jobs within a project.
 *
 * - Validates the `projectId` route parameter as a UUID before rendering content.
 * - Displays a paginated list of translation jobs with real-time status updates.
 * - Provides progress indicators and allows users to cancel running jobs.
 * - Enables monitoring and management of translation processes initiated in other areas of the application.
 * - Handles invalid or missing project IDs gracefully using `ValidationError` fallback.
 *
 * @returns {JSX.Element} Renders translation job management UI or validation error state
 */
export function TranslationJobsPage() {
  const { id } = useParams<keyof RouteParams>();

  // validate UUID format
  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  if (!validation.success) {
    return <ValidationError buttonLabel="Back to projects" dataTestId="translation-jobs-page" to="/projects" />;
  }

  return (
    <ErrorBoundary resetKeys={[projectId]}>
      <TranslationJobsContent projectId={projectId} />
    </ErrorBoundary>
  );
}
