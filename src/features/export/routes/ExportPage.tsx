import { Suspense, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Loading } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { ProjectExportContent } from '../components/ProjectExportContent';

interface RouteParams {
  projectId: string;
}

/**
 * ExportPage - Main page component for project export view
 *
 * Displays project information and provides functionality to export
 * all translations as a ZIP archive containing individual JSON files for each locale.
 */
export function ExportPage() {
  const { projectId } = useParams<keyof RouteParams>();
  const navigate = useNavigate();

  const validation = useMemo(() => UUID_SCHEMA.safeParse(projectId), [projectId]);
  const validatedProjectId = useMemo(() => validation.data ?? '', [validation.data]);

  const handleNavigateToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={handleNavigateToProjects} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<Loading />}>
      <ProjectExportContent projectId={validatedProjectId} />
    </Suspense>
  );
}
