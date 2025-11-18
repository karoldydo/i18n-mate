import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useCreateKey } from '@/features/keys/api/useCreateKey';
import { KeyForm } from '@/features/keys/components/forms/KeyForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

interface AddKeyDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  projectId: string;
  projectPrefix: string;
}

/**
 * Modal dialog for creating new translation keys with validation
 *
 * Renders a dialog containing a key creation form. Handles optimistic UI updates, loading state,
 * error/success toasts, and calls the `useCreateKey` mutation to persist a new key for the given project.
 * Invalidates the default view keys query on successful creation.
 *
 * The form is pre-filled with the required project prefix. Handles validation and error states in the UI,
 * and disables the submit button while submitting.
 *
 * @param {Object} props - Props for AddKeyDialog
 * @param {boolean} props.open - Controls dialog visibility
 * @param {(open: boolean) => void} props.onOpenChange - Called when dialog open state changes
 * @param {string} props.projectId - The current project ID for which the key is created
 * @param {string} props.projectPrefix - Key prefix, pre-filled and enforced in the form
 *
 * @returns {JSX.Element} Dialog with key creation form, validation, and side effect handling
 */
export function AddKeyDialog({ onOpenChange, open, projectId, projectPrefix }: AddKeyDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createKeyMutation = useCreateKey();

  // reset submitting state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = useCallback(
    (data: { defaultValue: string; fullKey: string }) => {
      setIsSubmitting(true);

      createKeyMutation.mutate(
        {
          default_value: data.defaultValue,
          full_key: data.fullKey,
          project_id: projectId,
        },
        {
          onError: ({ error }) => {
            toast.error(error.message);
            setIsSubmitting(false);
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keys-default-view'] });
            toast.success('Translation key created successfully');
            onOpenChange(false);
            setIsSubmitting(false);
          },
        }
      );
    },
    [createKeyMutation, onOpenChange, projectId, queryClient]
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Translation Key</DialogTitle>
          <DialogDescription>
            Create a new translation key for your project. The key must start with the project prefix.
          </DialogDescription>
        </DialogHeader>
        <KeyForm isSubmitting={isSubmitting} onSubmit={handleSubmit} projectPrefix={projectPrefix} />
      </DialogContent>
    </Dialog>
  );
}
