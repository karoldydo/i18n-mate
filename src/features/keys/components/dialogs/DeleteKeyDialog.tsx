import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import type { KeyDefaultViewItem } from '@/shared/types';

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

import { useDeleteKey } from '../../api/useDeleteKey';

interface DeleteKeyDialogProps {
  keyData: KeyDefaultViewItem | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * DeleteKeyDialog - Confirmation dialog for irreversible key deletion
 *
 * Displays key information and warns about cascade delete behavior.
 * All translations across languages will be permanently removed.
 */
export function DeleteKeyDialog({ keyData, onConfirm, onOpenChange, open }: DeleteKeyDialogProps) {
  const queryClient = useQueryClient();
  const deleteKeyMutation = useDeleteKey();

  const handleConfirm = useCallback(() => {
    if (!keyData) return;

    deleteKeyMutation.mutate(keyData.id, {
      onError: ({ error }) => {
        toast.error(error.message);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['keys-default-view'] });
        toast.success('Translation key deleted successfully');
        onConfirm();
        onOpenChange(false);
      },
    });
  }, [deleteKeyMutation, keyData, onConfirm, onOpenChange, queryClient]);

  const handleActionClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      handleConfirm();
    },
    [handleConfirm]
  );

  if (!keyData) return null;

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Translation Key</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the key <strong className="font-mono">{keyData.full_key}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="bg-destructive/10 border-destructive my-4 rounded-lg border p-4">
          <p className="text-destructive flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Warning: This action cannot be undone
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Deleting this key will permanently remove all translations across all languages for this project.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteKeyMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteKeyMutation.isPending}
            onClick={handleActionClick}
          >
            {deleteKeyMutation.isPending ? 'Deleting...' : 'Delete Key'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
