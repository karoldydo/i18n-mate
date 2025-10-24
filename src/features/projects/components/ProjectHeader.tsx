import type { ProjectResponse } from '@/shared/types';

import { Button } from '@/shared/ui/button';

interface ProjectHeaderProps {
  onDelete: () => void;
  onEdit: () => void;
  project: ProjectResponse;
  stats?: ProjectStats;
}

interface ProjectStats {
  keyCount: number;
  localeCount: number;
}

/**
 * ProjectHeader - Header section with project title, description, actions, and statistics
 *
 * Displays project name, optional description, action buttons (edit/delete),
 * and project statistics in a clean, organized layout.
 */
export function ProjectHeader({ onDelete, onEdit, project, stats }: ProjectHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1 space-y-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && <p className="text-muted-foreground text-base">{project.description}</p>}
        </div>

        {stats && (
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Keys:</span>
              <span className="font-semibold">{stats.keyCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Locales:</span>
              <span className="font-semibold">{stats.localeCount}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button aria-label="Edit project" onClick={onEdit} variant="outline">
          Edit
        </Button>
        <Button aria-label="Delete project" onClick={onDelete} variant="destructive">
          Delete
        </Button>
      </div>
    </div>
  );
}
