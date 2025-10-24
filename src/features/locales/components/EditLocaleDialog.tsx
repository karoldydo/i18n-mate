import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ProjectLocaleWithDefault, UpdateProjectLocaleRequest } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { UPDATE_PROJECT_LOCALE_SCHEMA } from '../api/locales.schemas';
import { useUpdateProjectLocale } from '../api/useUpdateProjectLocale';

interface EditLocaleDialogProps {
  locale: null | ProjectLocaleWithDefault;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  projectId: string;
}

/**
 * EditLocaleDialog - Modal dialog for editing locale labels
 *
 * Provides form with validation for updating locale labels only.
 * Locale code is immutable after creation.
 */
export function EditLocaleDialog({ locale, onOpenChange, open, projectId }: EditLocaleDialogProps) {
  const updateLocale = useUpdateProjectLocale(projectId, locale?.id ?? '');

  const form = useForm<UpdateProjectLocaleRequest>({
    defaultValues: {
      label: locale?.label ?? '',
    },
    resolver: zodResolver(UPDATE_PROJECT_LOCALE_SCHEMA),
  });

  // Reset form when locale changes or dialog opens
  useEffect(() => {
    if (open && locale) {
      form.reset({
        label: locale.label,
      });
    }
  }, [open, locale, form]);

  const onSubmit = (data: UpdateProjectLocaleRequest) => {
    if (!locale) return;

    const payload: UpdateProjectLocaleRequest = {
      label: data.label?.trim(),
    };

    updateLocale.mutate(payload, {
      onError: ({ error }) => {
        toast.error(error.message);
      },
      onSuccess: () => {
        toast.success('Language updated successfully');
        onOpenChange(false);
      },
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !updateLocale.isPending) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

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
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
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
