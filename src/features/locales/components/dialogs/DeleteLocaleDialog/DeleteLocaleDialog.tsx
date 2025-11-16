import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

import type { LocaleItem } from '@/shared/types';

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

import { useDeleteProjectLocale } from '../../../api/useDeleteProjectLocale';

interface DeleteLocaleDialogProps {
  locale: LocaleItem | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * DeleteLocaleDialog – Modal dialog to confirm and execute the deletion of a locale
 *
 * Presents a strong warning and details about the consequences:
 *   - Displays the language name and locale code being deleted
 *   - Informs the user that deleting a locale will permanently remove all translations for that locale
 *   - Irreversible action requiring explicit user confirmation
 *
 * Intended to be triggered from the project locales management view.
 * Deletion of the default locale must be prevented elsewhere in the UI.
 *
 * @param {DeleteLocaleDialogProps} props - Dialog control props
 * @param {LocaleItem | null} props.locale - The target locale for deletion, or null to remain hidden
 * @param {boolean} props.open - Whether the dialog is open
 * @param {(open: boolean) => void} props.onOpenChange - Callback to open/close the dialog
 *
 * @returns {JSX.Element | null} Confirmation dialog UI if locale is set, otherwise null
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
