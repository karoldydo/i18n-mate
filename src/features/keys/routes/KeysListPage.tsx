import { Suspense, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ErrorBoundary, Loading } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { KeysListContent } from '../components/views/KeysListContent';

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
  const navigate = useNavigate();

  // validate UUID format
  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  // invalid project ID
  if (!validation.success) {
    return (
      <div className="container">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={handleBackToProjects} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary resetKeys={[projectId]}>
      <Suspense fallback={<Loading />}>
        <KeysListContent projectId={projectId} />
      </Suspense>
    </ErrorBoundary>
  );
}
