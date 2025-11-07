import { Pencil, Trash2 } from 'lucide-react';

import type { ProjectResponse } from '@/shared/types';

import { Button } from '@/shared/ui/button';

interface ProjectHeaderProps {
  onDelete: () => void;
  onEdit: () => void;
  project: ProjectResponse;
}

/**
 * ProjectHeader – Displays the header section for a project details page.
 *
 * Renders the project name, an optional project description, and action buttons
 * for editing or deleting the project. Action buttons are accessible, clearly
 * labeled, and visually grouped for easy discovery.
 *
 * Used at the top of the project details layout. Optimized for both mobile and
 * desktop layouts. No project metadata is shown here—see ProjectMetadata for stats.
 *
 * @param {Object} props - Component props
 * @param {() => void} props.onDelete - Handler invoked when delete action is triggered
 * @param {() => void} props.onEdit - Handler invoked when edit action is triggered
 * @param {ProjectResponse} props.project - Project object with name and description
 *
 * @returns {JSX.Element} The header section with title, description, and actions
 */
export function ProjectHeader({ onDelete, onEdit, project }: ProjectHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1 space-y-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && <p className="text-muted-foreground text-base">{project.description}</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <Button aria-label="Edit project" onClick={onEdit} variant="outline">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button aria-label="Delete project" onClick={onDelete} variant="destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
