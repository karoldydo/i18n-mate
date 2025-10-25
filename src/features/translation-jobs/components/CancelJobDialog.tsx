import type { TranslationJobResponse } from '@/shared/types';

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

interface CancelJobDialogProps {
  isLoading: boolean;
  isOpen: boolean;
  job: null | TranslationJobResponse;
  onConfirmCancel: () => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * CancelJobDialog - Confirmation dialog for cancelling translation jobs
 *
 * Displays job details and warning about irreversible operation.
 * Only shown for jobs with status 'pending' or 'running'.
 * Completed translations are preserved after cancellation.
 */
export function CancelJobDialog({ isLoading, isOpen, job, onConfirmCancel, onOpenChange }: CancelJobDialogProps) {
  if (!job) {
    return null;
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Translation Job?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to cancel this translation job?</p>
            <div className="border-border mt-3 rounded-lg border p-3">
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="font-medium">Mode:</dt>
                  <dd className="text-muted-foreground capitalize">{job.mode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Target Locale:</dt>
                  <dd className="text-muted-foreground">{job.target_locale}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Progress:</dt>
                  <dd className="text-muted-foreground">
                    {job.completed_keys ?? 0}/{job.total_keys ?? 0} keys
                  </dd>
                </div>
              </dl>
            </div>
            <p className="text-destructive mt-3 text-sm font-medium">
              ⚠️ This action cannot be undone. Completed translations will be preserved, but remaining keys will not be
              translated.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault();
              onConfirmCancel();
            }}
          >
            {isLoading ? 'Cancelling...' : 'Confirm Cancel'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
