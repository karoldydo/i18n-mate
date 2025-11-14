import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import type { ProjectResponse } from '@/shared/types';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

import { useDeleteProject } from '../../api/useDeleteProject';

interface DeleteProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: ProjectResponse;
}

/**
 * DeleteProjectDialog – Confirmation modal for permanently deleting a project.
 *
 * Renders an irreversible deletion dialog for the specified project, warning the user
 * of all associated data loss. Presents a summary of what will be deleted, including language,
 * translation keys, and project metadata counts. Disables dialog actions while deletion is in progress.
 *
 * Handles deletion as follows:
 * - On confirmation, calls the project deletion mutation.
 *   - On success: invalidates project list queries, shows success toast, navigates to the project list,
 *     and closes the dialog.
 *   - On failure: displays the error message in a toast.
 *
 * @param {Object} props - The properties object.
 * @param {boolean} props.open - Whether the dialog is open and visible.
 * @param {(open: boolean) => void} props.onOpenChange - Callback to control dialog open state.
 *   When set to false, closes the dialog.
 * @param {ProjectResponse} props.project - The project to delete. Must contain name, locale_count, and key_count.
 *
 * @returns {JSX.Element} Modal dialog for deleting a project.
 */
export function DeleteProjectDialog({ onOpenChange, open, project }: DeleteProjectDialogProps) {
  const queryClient = useQueryClient();
  const deleteProject = useDeleteProject();
  const navigate = useNavigate();

  const handleDelete = useCallback(() => {
    deleteProject.mutate(project.id, {
      onError: ({ error }) => {
        toast.error(error.message);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        toast.success('Project deleted successfully');
        onOpenChange(false);
        navigate('/projects');
      },
    });
  }, [deleteProject, navigate, onOpenChange, project.id, queryClient]);

  const handleDeleteClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      handleDelete();
    },
    [handleDelete]
  );

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent data-testid="delete-project-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to delete <span className="font-semibold">{project.name}</span>?
              </p>
              <p className="text-destructive">
                This action cannot be undone. This will permanently delete the project and all associated data
                including:
              </p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>{project.locale_count} language(s)</li>
                <li>{project.key_count} translation key(s)</li>
                <li>All translations and metadata</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="delete-project-cancel-button" disabled={deleteProject.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-project-confirm-button"
            disabled={deleteProject.isPending}
            onClick={handleDeleteClick}
          >
            {deleteProject.isPending ? 'Deleting...' : 'Delete project'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
