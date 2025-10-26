import { useNavigate, useParams } from 'react-router';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

import { useProjectKeyCount } from '../../keys/api/useProjectKeyCount';
import { useProjectLocales } from '../../locales/api/useProjectLocales';
import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { useProject } from '../../projects/api/useProject';
import { ExportActions, ExportLayout } from '../components';

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

  // validate UUID format
  const validation = UUID_SCHEMA.safeParse(projectId);
  const validatedProjectId = validation.data ?? '';

  const {
    data: project,
    error: projectError,
    isError: isProjectError,
    isLoading: isProjectLoading,
  } = useProject(validatedProjectId);
  const {
    data: locales,
    error: localesError,
    isError: isLocalesError,
    isLoading: isLocalesLoading,
  } = useProjectLocales(validatedProjectId);
  const {
    data: keyCount,
    error: keyCountError,
    isError: isKeyCountError,
    isLoading: isKeyCountLoading,
  } = useProjectKeyCount(validatedProjectId);

  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={() => navigate('/projects')} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // loading state
  if (isProjectLoading || isLocalesLoading || isKeyCountLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  // error state
  const error = projectError || localesError || keyCountError;
  const hasError = isProjectError || isLocalesError || isKeyCountError;

  if (hasError || !project || !locales) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Project Data</h2>
          <p className="text-muted-foreground text-sm">
            {error?.error?.message || 'Failed to load project or locale data.'}
          </p>
          <Button className="mt-4" onClick={() => navigate(`/projects/${validatedProjectId}`)} variant="outline">
            Back to Project Details
          </Button>
        </div>
      </div>
    );
  }

  const stats = {
    keyCount: keyCount ?? 0,
    localeCount: locales.length,
  };

  const isExportDisabled = locales.length === 0;

  return (
    <ExportLayout project={project} stats={stats}>
      <ExportActions isDisabled={isExportDisabled} projectId={validatedProjectId} />
    </ExportLayout>
  );
}
