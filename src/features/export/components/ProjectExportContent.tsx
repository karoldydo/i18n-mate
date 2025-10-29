import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';

import { useProjectKeyCount } from '@/features/keys/api/useProjectKeyCount';
import { useProjectLocales } from '@/features/locales/api/useProjectLocales';
import { useProject } from '@/features/projects/api/useProject';
import { Button } from '@/shared/ui/button';

import { ExportActions } from './ExportActions';
import { ExportLayout } from './ExportLayout';

interface ProjectExportContentProps {
  projectId: string;
}

/**
 * ProjectExportContent - Suspense-enabled content for the export feature
 *
 * Fetches project, locales, and key counts using suspense-based queries to
 * provide a smooth loading experience. Displays project export summary and
 * actions once data is available, with graceful error handling.
 */
export function ProjectExportContent({ projectId }: ProjectExportContentProps) {
  const navigate = useNavigate();

  const { data: project, error: projectError, isError: isProjectError } = useProject(projectId);
  const { data: locales, error: localesError, isError: isLocalesError } = useProjectLocales(projectId);
  const { data: keyCount, error: keyCountError, isError: isKeyCountError } = useProjectKeyCount(projectId);

  const error = useMemo(
    () => projectError || localesError || keyCountError,
    [projectError, localesError, keyCountError]
  );

  const hasError = useMemo(
    () => isProjectError || isLocalesError || isKeyCountError || !project || !locales,
    [isProjectError, isLocalesError, isKeyCountError, project, locales]
  );

  const stats = useMemo(
    () => ({
      keyCount: keyCount ?? 0,
      localeCount: locales?.length ?? 0,
    }),
    [keyCount, locales]
  );

  const isExportDisabled = useMemo(() => (locales?.length ?? 0) === 0, [locales]);

  const handleNavigateToProjectDetails = useCallback(() => {
    navigate(`/projects/${projectId}`);
  }, [navigate, projectId]);

  if (hasError) {
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
    <div className="animate-in fade-in duration-500">
      <ExportLayout project={project} stats={stats}>
        <ExportActions isDisabled={isExportDisabled} projectId={projectId} />
      </ExportLayout>
    </div>
  );
}
