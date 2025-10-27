import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

import type { ProjectLocaleWithDefault } from '@/shared/types';

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

import { useDeleteProjectLocale } from '../api/useDeleteProjectLocale';

interface DeleteLocaleDialogProps {
  locale: null | ProjectLocaleWithDefault;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * DeleteLocaleDialog - Confirmation dialog for irreversible locale deletion
 *
 * Displays locale code and warning about cascading deletion of all translations.
 * Default locale cannot be deleted (should be prevented at UI level).
 */
export function DeleteLocaleDialog({ locale, onOpenChange, open }: DeleteLocaleDialogProps) {
  const queryClient = useQueryClient();
  const deleteLocale = useDeleteProjectLocale();

  const handleDelete = useCallback(() => {
    if (!locale) return;

    deleteLocale.mutate(locale.id, {
      onError: ({ error }) => {
        toast.error(error.message);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['project-locales'] });
        toast.success('Language deleted successfully');
        onOpenChange(false);
      },
    });
  }, [locale, deleteLocale, queryClient, onOpenChange]);

  const handleConfirmClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      handleDelete();
    },
    [handleDelete]
  );

  if (!locale) return null;

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Language</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to delete{' '}
                <span className="font-semibold">
                  {locale.label} ({locale.locale})
                </span>
                ?
              </p>
              <p className="text-destructive">
                This action cannot be undone. This will permanently delete the language and all associated translations
                for this locale.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteLocale.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteLocale.isPending}
            onClick={handleConfirmClick}
          >
            {deleteLocale.isPending ? 'Deleting...' : 'Delete Language'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
