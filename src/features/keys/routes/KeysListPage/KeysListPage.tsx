import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

import { UUID_SCHEMA } from '../../../projects/api/projects.schemas';
import { KeysListContent } from '../../components/views/KeysListContent';

interface RouteParams {
  id: string;
}

/**
 * KeysListPage - Main page component for keys list default view
 *
 * Displays translation keys for a project showing values in the default language
 * along with missing translation counts for other languages. Provides search,
 * filtering, pagination, inline editing, and key management operations.
 */
export function KeysListPage() {
  const { id } = useParams<keyof RouteParams>();

  // validate UUID format
  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  if (!validation.success) {
    return <ValidationError buttonLabel="Back to projects" dataTestId="keys-list-page" to="/projects" />;
  }

  return (
    <ErrorBoundary resetKeys={[projectId]}>
      <KeysListContent projectId={projectId} />
    </ErrorBoundary>
  );
}
