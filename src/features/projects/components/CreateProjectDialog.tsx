import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import type { CreateProjectRequest } from '@/shared/types';

import { LocaleSelector } from '@/shared/components/LocaleSelector';
import { LOCALE_NORMALIZATION } from '@/shared/constants';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

import { CREATE_PROJECT_REQUEST_SCHEMA } from '../api/projects.schemas';
import { useCreateProject } from '../api/useCreateProject';

interface CreateProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * CreateProjectDialog - Modal dialog for creating new projects
 *
 * Provides form with validation for project creation including name, description,
 * prefix, default locale, and locale label. Navigates to project details on success.
 */
export function CreateProjectDialog({ onOpenChange, open }: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const form = useForm<CreateProjectRequest>({
    defaultValues: {
      default_locale: '',
      default_locale_label: '',
      description: '',
      name: '',
      prefix: '',
    },
    mode: 'onChange',
    resolver: zodResolver(CREATE_PROJECT_REQUEST_SCHEMA),
  });

  const onSubmit = (data: CreateProjectRequest) => {
    const payload: CreateProjectRequest = {
      default_locale: LOCALE_NORMALIZATION.normalize(data.default_locale),
      default_locale_label: data.default_locale_label,
      description: data.description || null,
      name: data.name,
      prefix: data.prefix,
    };

    createProject.mutate(payload, {
      onError: ({ error }) => {
        toast.error(error.message);
      },
      onSuccess: (project) => {
        toast.success('Project created successfully');
        form.reset();
        onOpenChange(false);
        navigate(`/projects/${project.id}`);
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
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Create a new translation project with a default locale.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Application" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Project description" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefix</FormLabel>
                  <FormControl>
                    <Input placeholder="app" {...field} />
                  </FormControl>
                  <FormDescription>
                    2-4 characters: lowercase letters, numbers, dots, underscores, hyphens. No trailing dot.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Locale</FormLabel>
                  <FormControl>
                    <LocaleSelector
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Auto-populate label based on selected locale
                        const localeName = new Intl.DisplayNames(['en'], { type: 'language' }).of(value.split('-')[0]);
                        if (localeName) {
                          form.setValue('default_locale_label', localeName);
                        }
                      }}
                      value={field.value}
                    />
                  </FormControl>
                  <FormDescription>BCP-47 format (e.g., &ldquo;en&rdquo; or &ldquo;en-US&rdquo;)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_locale_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locale Label</FormLabel>
                  <FormControl>
                    <Input placeholder="English" {...field} />
                  </FormControl>
                  <FormDescription>Human-readable name for the default locale</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button disabled={createProject.isPending || !form.formState.isValid} type="submit">
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
