import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { CreateLocaleRequest } from '@/shared/types';

import { LocaleSelector } from '@/shared/components/LocaleSelector';
import { LOCALE_NORMALIZATION, PRIMARY_LOCALES } from '@/shared/constants';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { CREATE_LOCALE_SCHEMA } from '../../../api/locales.schemas';
import { useCreateProjectLocale } from '../../../api/useCreateProjectLocale';

interface AddLocaleDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  projectId: string;
}

/**
 * AddLocaleDialog – Modal dialog for adding a new locale to a project
 *
 * Renders a controlled form for adding a new language/locale to the specified project.
 * Form fields include:
 *   - BCP-47 locale code (with validation and a selector for common languages)
 *   - Human-readable language label (with length validation)
 *
 * Handles submission via react-hook-form and zod validation schema.
 * On successful creation:
 *   - Invalidates the project locales query cache
 *   - Provides user feedback via toast messages
 *   - Resets the form and closes the dialog
 *
 * @param {object} props - Dialog props
 * @param {(open: boolean) => void} props.onOpenChange - Callback to control dialog open state
 * @param {boolean} props.open - Whether the dialog is open
 * @param {string} props.projectId - Project identifier for which to add the locale
 *
 * @returns {JSX.Element} The dialog and new locale form UI
 */
export function AddLocaleDialog({ onOpenChange, open, projectId }: AddLocaleDialogProps) {
  const queryClient = useQueryClient();
  const createLocale = useCreateProjectLocale(projectId);

  const form = useForm<CreateLocaleRequest>({
    defaultValues: {
      label: '',
      locale: '',
    },
    mode: 'onChange',
    resolver: zodResolver(CREATE_LOCALE_SCHEMA),
  });
  const { control, formState, handleSubmit, reset, setValue } = form;

  const handleLocaleChange = useCallback(
    (localeCode: string) => {
      setValue('locale', localeCode, { shouldValidate: true });

      const locale = PRIMARY_LOCALES.find((locale) => locale.code === localeCode);
      if (locale) {
        setValue('label', locale.label, { shouldValidate: true });
      }
    },
    [setValue]
  );

  const onSubmit = useCallback(
    (data: CreateLocaleRequest) => {
      const payload: CreateLocaleRequest = {
        label: data.label.trim(),
        locale: LOCALE_NORMALIZATION.normalize(data.locale),
      };

      createLocale.mutate(payload, {
        onError: ({ error }) => {
          toast.error(error.message);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['project-locales'] });
          toast.success('Language added successfully');
          reset();
          onOpenChange(false);
        },
      });
    },
    [createLocale, queryClient, reset, onOpenChange]
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        reset();
      }
      onOpenChange(newOpen);
    },
    [reset, onOpenChange]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Language</DialogTitle>
          <DialogDescription>Add a new language to this project with BCP-47 locale code.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <FormField
              control={control}
              name="locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locale Code</FormLabel>
                  <FormControl>
                    <LocaleSelector
                      disabled={createLocale.isPending}
                      onValueChange={handleLocaleChange}
                      value={field.value}
                    />
                  </FormControl>
                  <FormDescription>Select a BCP-47 locale code (e.g., &#39;en&#39; or &#39;en-US&#39;)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language Label</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={createLocale.isPending}
                      maxLength={64}
                      placeholder="e.g., English, Spanish, German"
                    />
                  </FormControl>
                  <FormDescription>Human-readable name for this language (max 64 characters)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                disabled={createLocale.isPending}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={!formState.isValid || createLocale.isPending} type="submit">
                {createLocale.isPending ? 'Adding...' : 'Add Language'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
