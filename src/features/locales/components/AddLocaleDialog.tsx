import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { CreateProjectLocaleRequest } from '@/shared/types';

import { LocaleSelector } from '@/shared/components/LocaleSelector';
import { LOCALE_NORMALIZATION } from '@/shared/constants';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA } from '../api/locales.schemas';
import { useCreateProjectLocale } from '../api/useCreateProjectLocale';

interface AddLocaleDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  projectId: string;
}

/**
 * AddLocaleDialog - Modal dialog for adding new locales to a project
 *
 * Provides form with BCP-47 validation for locale code and label length validation.
 * Uses LocaleSelector dropdown for common primary language subtags.
 */
export function AddLocaleDialog({ onOpenChange, open, projectId }: AddLocaleDialogProps) {
  const createLocale = useCreateProjectLocale(projectId);

  const form = useForm<CreateProjectLocaleRequest>({
    defaultValues: {
      p_label: '',
      p_locale: '',
      p_project_id: projectId,
    },
    mode: 'onChange',
    resolver: zodResolver(CREATE_PROJECT_LOCALE_ATOMIC_SCHEMA),
  });

  const onSubmit = (data: CreateProjectLocaleRequest) => {
    const payload: CreateProjectLocaleRequest = {
      p_label: data.p_label.trim(),
      p_locale: LOCALE_NORMALIZATION.normalize(data.p_locale),
      p_project_id: projectId,
    };

    createLocale.mutate(payload, {
      onError: ({ error }) => {
        toast.error(error.message);
      },
      onSuccess: () => {
        toast.success('Language added successfully');
        form.reset();
        onOpenChange(false);
      },
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Language</DialogTitle>
          <DialogDescription>Add a new language to this project with BCP-47 locale code.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="p_locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locale Code</FormLabel>
                  <FormControl>
                    <LocaleSelector
                      disabled={createLocale.isPending}
                      onValueChange={field.onChange}
                      value={field.value}
                    />
                  </FormControl>
                  <FormDescription>Select a BCP-47 locale code (e.g., &#39;en&#39; or &#39;en-US&#39;)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="p_label"
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
              <Button disabled={createLocale.isPending} type="submit">
                {createLocale.isPending ? 'Adding...' : 'Add Language'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
