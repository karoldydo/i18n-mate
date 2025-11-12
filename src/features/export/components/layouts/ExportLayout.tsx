import type { ReactNode } from 'react';

import type { ProjectResponse } from '@/shared/types';

import { CardItem } from '@/shared/components/CardItem';

interface ExportLayoutProps {
  children?: ReactNode;
  project: ProjectResponse;
  stats: ProjectStats;
}

interface ProjectStats {
  keyCount: number;
  localeCount: number;
}

/**
 * ExportLayout
 *
 * Layout wrapper for the translation export view.
 *
 * Provides a consistent, responsive structure for export-related content,
 * including a project summary section (project name, description, locale count,
 * and key count) and a dedicated actions area for export controls.
 *
 * @param {Object} props - Component properties.
 * @param {React.ReactNode} [props.children] - Export action controls or content to be rendered in the export options section.
 * @param {ProjectResponse} props.project - The project entity with metadata (name, optional description).
 * @param {ProjectStats} props.stats - Object containing summary statistics (locale and key counts) for the project.
 *
 * @returns {JSX.Element} Structured export layout with project summary and export controls.
 */
export function ExportLayout({ children, project, stats }: ExportLayoutProps) {
  return (
    <div className="container">
      <div className="space-y-6">
        {/* Export Summary */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CardItem>
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm leading-none font-medium">Project</p>
                <p className="text-2xl font-bold">{project.name}</p>
              </div>
            </div>
            {project.description && <p className="text-muted-foreground mt-2 text-sm">{project.description}</p>}
          </CardItem>
          <CardItem>
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm leading-none font-medium">Locales</p>
                <p className="text-2xl font-bold">{stats.localeCount}</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">Available languages</p>
          </CardItem>
          <CardItem>
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm leading-none font-medium">Keys</p>
                <p className="text-2xl font-bold">{stats.keyCount}</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">Translation keys</p>
          </CardItem>
        </div>

        {/* Export Actions */}
        <CardItem>
          <h2 className="mb-4 text-xl font-semibold">Export Options</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Export all translations as a ZIP archive containing individual JSON files for each locale. Files will be
              UTF-8 encoded with dotted keys sorted alphabetically.
            </p>
            {children}
          </div>
        </CardItem>
      </div>
    </div>
  );
}
