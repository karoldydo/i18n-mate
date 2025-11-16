import { useMemo } from 'react';

import { useProjectKeyCount } from '@/features/keys/api/useProjectKeyCount';
import { useProjectLocales } from '@/features/locales/api/useProjectLocales';
import { useProject } from '@/features/projects/api/useProject';
import { BackButton, PageHeader } from '@/shared/components';

import { ExportActions } from '../../forms/ExportActions';
import { ExportLayout } from '../../layouts/ExportLayout';

interface ProjectExportContentProps {
  projectId: string;
}

/**
 * ProjectExportContent - Suspense-enabled content component for the export translations feature.
 *
 * Handles retrieval of all necessary project data—including project details,
 * locale list, and translation key count—using suspense-based queries to ensure
 * a smooth transitional loading experience. Presents project export summary and
 * available export actions when data is ready.
 *
 * - If the project data is unavailable, renders nothing.
 * - Disables export actions if there are no locales available.
 * - Passes computed stats (locale and key count) to the export layout.
 * - Renders export controls, back navigation, and descriptive headers.
 *
 * @param {ProjectExportContentProps} props - Component properties
 * @param {string} props.projectId - The unique identifier of the project to export
 *
 * @returns {JSX.Element | null} Animated project export view, or null if project not loaded
 *
 * @see {@link useProject} for project data fetching
 * @see {@link useProjectLocales} for locale list fetching
 * @see {@link useProjectKeyCount} for key count fetching
 * @see {@link ExportLayout} for the layout wrapper
 * @see {@link ExportActions} for export controls
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
      <div className="space-y-6">
        <BackButton ariaLabel="Back to project details" buttonLabel="Back to project" to={`/projects/${projectId}`} />
        <PageHeader
          header="Export translations"
          subHeading="Download all translations for this project as a ZIP archive"
        />
        <ExportLayout project={project} stats={stats}>
          <ExportActions isDisabled={isExportDisabled} projectId={projectId} />
        </ExportLayout>
      </div>
    </div>
  );
}
