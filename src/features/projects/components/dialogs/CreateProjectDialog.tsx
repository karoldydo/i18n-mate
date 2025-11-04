import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
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

import { CREATE_PROJECT_REQUEST_SCHEMA } from '../../api/projects.schemas';
import { useCreateProject } from '../../api/useCreateProject';

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
  const queryClient = useQueryClient();
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

  const { formState, handleSubmit, reset, setValue } = form;

  const isSubmitDisabled = useMemo(
    () => createProject.isPending || !formState.isValid,
    [createProject.isPending, formState.isValid]
  );

  const onSubmit = useCallback(
    (data: CreateProjectRequest) => {
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
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          toast.success('Project created successfully');
          reset();
          onOpenChange(false);
          navigate(`/projects/${project.id}`);
        },
      });
    },
    [createProject, navigate, onOpenChange, queryClient, reset]
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        reset();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, reset]
  );

  const handleLocaleValueChange = useCallback(
    (value: string, fieldOnChange: (value: string) => void) => {
      fieldOnChange(value);
      const localeName = new Intl.DisplayNames(['en'], { type: 'language' }).of(value.split('-')[0]);
      if (localeName) {
        setValue('default_locale_label', localeName, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    },
    [setValue]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-[525px]" data-testid="create-project-dialog">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Create a new translation project with a default locale.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input data-testid="create-project-name-input" placeholder="My Application" {...field} />
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
                    <Textarea
                      data-testid="create-project-description-input"
                      placeholder="Project description"
                      {...field}
                      value={field.value || ''}
                    />
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
                    <Input data-testid="create-project-prefix-input" placeholder="app" {...field} />
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
                      data-testid="create-project-locale-selector"
                      onValueChange={(value) => handleLocaleValueChange(value, field.onChange)}
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
                    <Input data-testid="create-project-locale-label-input" placeholder="English" {...field} />
                  </FormControl>
                  <FormDescription>Human-readable name for the default locale</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button data-testid="create-project-submit-button" disabled={isSubmitDisabled} type="submit">
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
