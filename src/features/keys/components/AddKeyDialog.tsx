import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

import { useCreateKey } from '../api/useCreateKey';
import { KeyForm } from './KeyForm';

interface AddKeyDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  projectId: string;
  projectPrefix: string;
}

/**
 * AddKeyDialog - Modal dialog for creating new translation keys
 *
 * Displays a form for creating new keys with validation and error handling.
 * Pre-fills the key prefix based on project configuration.
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
