import { useMemo } from 'react';

import { useProjectKeyCount } from '@/features/keys/api/useProjectKeyCount';
import { useProjectLocales } from '@/features/locales/api/useProjectLocales';
import { useProject } from '@/features/projects/api/useProject';

import { ExportActions } from '../forms/ExportActions';
import { ExportLayout } from '../layouts/ExportLayout';

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
  const { data: project } = useProject(projectId);
  const { data: locales } = useProjectLocales(projectId);
  const { data: keyCount } = useProjectKeyCount(projectId);

  const localeCount = locales.length;

  const stats = useMemo(
    () => ({
      keyCount: keyCount ?? 0,
      localeCount,
    }),
    [keyCount, localeCount]
  );

  const isExportDisabled = useMemo(() => localeCount === 0, [localeCount]);

  if (!project) {
    return null;
  }

  return (
    <div className="animate-in fade-in duration-500">
      <ExportLayout project={project} stats={stats}>
        <ExportActions isDisabled={isExportDisabled} projectId={projectId} />
      </ExportLayout>
    </div>
  );
}
