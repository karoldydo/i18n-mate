import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import type { ProjectWithCounts } from '@/shared/types';

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

import { useDeleteProject } from '../api/useDeleteProject';

interface DeleteProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: ProjectWithCounts;
}

/**
 * DeleteProjectDialog - Confirmation dialog for irreversible project deletion
 *
 * Displays project name and warning about cascading deletion of all related data.
 * Requires explicit confirmation before executing the delete operation.
 */
export function DeleteProjectDialog({ onOpenChange, open, project }: DeleteProjectDialogProps) {
  const deleteProject = useDeleteProject();
  const navigate = useNavigate();

  const handleDelete = () => {
    deleteProject.mutate(project.id, {
      onError: ({ error }) => {
        toast.error(error.message);
      },
      onSuccess: () => {
        toast.success('Project deleted successfully');
        onOpenChange(false);
        navigate('/projects');
      },
    });
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
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
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            {deleteProject.isPending ? 'Deleting...' : 'Delete Project'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
