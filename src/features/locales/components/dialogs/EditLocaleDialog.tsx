import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ProjectLocaleWithDefault, UpdateProjectLocaleRequest } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { UPDATE_PROJECT_LOCALE_SCHEMA } from '../../api/locales.schemas';
import { useUpdateProjectLocale } from '../../api/useUpdateProjectLocale';

interface EditLocaleDialogProps {
  locale: null | ProjectLocaleWithDefault;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * EditLocaleDialog - Modal dialog for editing locale labels
 *
 * Provides form with validation for updating locale labels only.
 * Locale code is immutable after creation.
 */
export function EditLocaleDialog({ locale, onOpenChange, open }: EditLocaleDialogProps) {
  const queryClient = useQueryClient();
  const updateLocale = useUpdateProjectLocale(locale?.id ?? '');

  const form = useForm<UpdateProjectLocaleRequest>({
    defaultValues: {
      label: locale?.label ?? '',
    },
    resolver: zodResolver(UPDATE_PROJECT_LOCALE_SCHEMA),
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
    (data: UpdateProjectLocaleRequest) => {
      if (!locale) return;

      const payload: UpdateProjectLocaleRequest = {
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
