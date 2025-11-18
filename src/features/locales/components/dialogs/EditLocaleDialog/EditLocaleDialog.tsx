import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { LocaleItem, UpdateLocaleRequest } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { UPDATE_LOCALE_SCHEMA } from '../../../api/locales.schemas';
import { useUpdateProjectLocale } from '../../../api/useUpdateProjectLocale';

interface EditLocaleDialogProps {
  locale: LocaleItem | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * EditLocaleDialog – Modal dialog for editing an existing locale's label
 *
 * Renders a controlled form that allows editing only the human-readable label
 * for a project locale. The locale code itself is immutable after creation and
 * cannot be edited here.
 *
 * Upon submission:
 *   - Validates the new label using zod and react-hook-form.
 *   - Submits an update via mutation hook.
 *   - On success: Invalidates the project locales query, shows a success toast,
 *     and closes the dialog.
 *   - On error: Displays an error toast to the user.
 *
 * When the dialog is opened or the `locale` prop changes, resets the form to
 * reflect the current locale's label.
 *
 * @param {EditLocaleDialogProps} props - Dialog control and state props
 * @param {LocaleItem | null} props.locale - The locale object to be edited; if null, dialog is hidden
 * @param {boolean} props.open - Whether the dialog is open
 * @param {(open: boolean) => void} props.onOpenChange - Callback to change dialog open state
 *
 * @returns {JSX.Element | null} The dialog form if a locale is provided, otherwise null
 */
export function EditLocaleDialog({ locale, onOpenChange, open }: EditLocaleDialogProps) {
  const queryClient = useQueryClient();
  const updateLocale = useUpdateProjectLocale(locale?.id ?? '');

  const form = useForm<UpdateLocaleRequest>({
    defaultValues: {
      label: locale?.label ?? '',
    },
    resolver: zodResolver(UPDATE_LOCALE_SCHEMA),
  });
  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (open && locale) {
      reset({
        label: locale.label,
      });
    }
  }, [open, locale, reset]);

  const onSubmit = useCallback(
    (data: UpdateLocaleRequest) => {
      if (!locale) return;

      const payload: UpdateLocaleRequest = {
        label: data.label?.trim(),
      };

      updateLocale.mutate(payload, {
        onError: ({ error }) => {
          toast.error(error.message);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['project-locales'] });
          toast.success('Language updated successfully');
          onOpenChange(false);
        },
      });
    },
    [locale, updateLocale, queryClient, onOpenChange]
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && !updateLocale.isPending) {
        reset();
      }
      onOpenChange(newOpen);
    },
    [updateLocale.isPending, reset, onOpenChange]
  );

  if (!locale) return null;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Language</DialogTitle>
          <DialogDescription>
            Update the language label. Locale code ({locale.locale}) cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <FormField
              control={control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language Label</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={updateLocale.isPending}
                      maxLength={64}
                      placeholder="e.g., English, Spanish, German"
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Human-readable name for this language (max 64 characters)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                disabled={updateLocale.isPending}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={updateLocale.isPending} type="submit">
                {updateLocale.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
