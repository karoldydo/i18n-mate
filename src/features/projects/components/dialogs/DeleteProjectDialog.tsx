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
 * DeleteProjectDialog – Modal dialog for confirming irreversible project deletion.
 *
 * Presents a confirmation dialog to the user before performing permanent deletion
 * of the specified project and all its related data (languages, keys, translations, metadata).
 * Lists summary statistics for the project, and displays appropriate warnings
 * about the destructive nature of the action.
 *
 * On confirmation, attempts deletion via mutation hook, then:
 *   - On success: notifies the user, navigates to the projects list, and closes the dialog.
 *   - On error: displays the error message as a toast notification.
 *
 * Disables actions while the deletion is in progress.
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is visible
 * @param {function(boolean): void} props.onOpenChange - Callback triggered when dialog open state changes
 * @param {ProjectResponse} props.project - The project object being deleted (includes name, counts)
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
      <AlertDialogContent>
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
          <AlertDialogCancel disabled={deleteProject.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
