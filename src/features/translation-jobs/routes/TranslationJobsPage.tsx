import { Suspense, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Loading } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { TranslationJobsContent } from '../components/TranslationJobsContent';

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
  const navigate = useNavigate();

  // validate UUID format
  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const validProjectId = useMemo(() => validation.data ?? '', [validation.data]);

  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  // invalid project ID
  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
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
    <Suspense fallback={<Loading />}>
      <TranslationJobsContent projectId={validProjectId} />
    </Suspense>
  );
}
