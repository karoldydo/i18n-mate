import type { ReactNode } from 'react';

import type { ProjectResponse } from '@/shared/types';

import { ExportHeader } from './ExportHeader';

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
 * ExportLayout - Layout wrapper for export view components
 *
 * Provides consistent structure and spacing for the export view.
 * Renders header, summary, and actions sections in a flex layout.
 */
export function ExportLayout({ children, project, stats }: ExportLayoutProps) {
  return (
    <div className="container mx-auto py-8">
      <ExportHeader projectId={project.id} />

      <div className="space-y-8">
        {/* Export Summary */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-muted/50 rounded-lg border p-6">
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm leading-none font-medium">Project</p>
                <p className="text-2xl font-bold">{project.name}</p>
              </div>
            </div>
            {project.description && <p className="text-muted-foreground mt-2 text-sm">{project.description}</p>}
          </div>

          <div className="bg-muted/50 rounded-lg border p-6">
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm leading-none font-medium">Locales</p>
                <p className="text-2xl font-bold">{stats.localeCount}</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">Available languages</p>
          </div>

          <div className="bg-muted/50 rounded-lg border p-6">
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm leading-none font-medium">Keys</p>
                <p className="text-2xl font-bold">{stats.keyCount}</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">Translation keys</p>
          </div>
        </div>

        {/* Export Actions */}
        <div className="bg-muted/50 rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">Export Options</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Export all translations as a ZIP archive containing individual JSON files for each locale. Files will be
              UTF-8 encoded with dotted keys sorted alphabetically.
            </p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
