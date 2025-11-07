import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { TranslationJobsContent } from '../components/views/TranslationJobsContent';

interface RouteParams {
  id: string;
}

/**
 * TranslationJobsPage - Main page component for translation jobs view
 *
 * Displays paginated list of translation jobs with real-time status updates,
 * progress indicators, and job management capabilities (cancel running jobs).
 * Supports monitoring active translation processes initiated from other parts of the application.
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
