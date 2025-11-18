import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/button';

interface ProjectActionsProps {
  onDelete: () => void;
  onEdit: () => void;
}

/**
 * ProjectActions – Action buttons for project operations.
 *
 * Renders edit and delete buttons for project management actions.
 * Buttons are accessible, clearly labeled, and visually grouped.
 *
 * @param {ProjectActionsProps} props - Component props
 * @param {() => void} props.onDelete - Handler invoked when delete action is triggered
 * @param {() => void} props.onEdit - Handler invoked when edit action is triggered
 *
 * @returns {JSX.Element} The action buttons container
 */
export function ProjectActions({ onDelete, onEdit }: ProjectActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button aria-label="Edit project" data-testid="project-details-edit-button" onClick={onEdit} variant="outline">
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
      <Button
        aria-label="Delete project"
        data-testid="project-details-delete-button"
        onClick={onDelete}
        variant="destructive"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </div>
  );
}
