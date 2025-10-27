import { useCallback, useMemo } from 'react';
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

  const validation = useMemo(() => UUID_SCHEMA.safeParse(projectId), [projectId]);
  const validatedProjectId = useMemo(() => validation.data ?? '', [validation.data]);

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

  const handleNavigateToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  const handleNavigateToProjectDetails = useCallback(() => {
    navigate(`/projects/${validatedProjectId}`);
  }, [navigate, validatedProjectId]);

  const isLoading = useMemo(
    () => isProjectLoading || isLocalesLoading || isKeyCountLoading,
    [isProjectLoading, isLocalesLoading, isKeyCountLoading]
  );

  const error = useMemo(
    () => projectError || localesError || keyCountError,
    [projectError, localesError, keyCountError]
  );
  const hasError = useMemo(
    () => isProjectError || isLocalesError || isKeyCountError,
    [isProjectError, isLocalesError, isKeyCountError]
  );

  const stats = useMemo(
    () => ({
      keyCount: keyCount ?? 0,
      localeCount: locales?.length ?? 0,
    }),
    [keyCount, locales]
  );

  const isExportDisabled = useMemo(() => (locales?.length ?? 0) === 0, [locales]);

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

  if (isLoading) {
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

  if (hasError || !project || !locales) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Project Data</h2>
          <p className="text-muted-foreground text-sm">
            {error?.error?.message || 'Failed to load project or locale data.'}
          </p>
          <Button className="mt-4" onClick={handleNavigateToProjectDetails} variant="outline">
            Back to Project Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ExportLayout project={project} stats={stats}>
      <ExportActions isDisabled={isExportDisabled} projectId={validatedProjectId} />
    </ExportLayout>
  );
}
