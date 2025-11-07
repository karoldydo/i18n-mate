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
 * CreateProjectDialog – Modal dialog for creating a new project.
 *
 * Renders a controlled form with comprehensive validation for the following fields:
 *   - Project name (required)
 *   - Description (optional)
 *   - Prefix (required, 2-4 chars, validates allowed charset)
 *   - Default locale (required, BCP-47 code; updates human label)
 *   - Locale label (required; may auto-update from locale selection)
 *
 * Behavior:
 * - Disables submit if mutation is in progress or form is invalid.
 * - Upon successful creation:
 *   - Invalidates project queries to ensure cache consistency.
 *   - Shows success toast notification.
 *   - Closes dialog and resets form state.
 *   - Navigates to the details view of the created project.
 * - On failure, displays a relevant error toast.
 * - Resets form fields when dialog is closed via user action.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is visible/open
 * @param {(open: boolean) => void} props.onOpenChange - Callback triggered when dialog open state changes
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
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-semibold">Create Project</DialogTitle>
          <DialogDescription className="text-xs font-light">
            Create a new project with a default language.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Project name
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input data-testid="create-project-name-input" placeholder="My Application" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="create-project-description-input"
                      placeholder="Project description..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Prefix
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input data-testid="create-project-prefix-input" placeholder="app" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    2-4 characters: lowercase letters, numbers, dots, underscores, hyphens. No trailing dot.
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Default language
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <LocaleSelector
                      data-testid="create-project-locale-selector"
                      onValueChange={(value) => handleLocaleValueChange(value, field.onChange)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    BCP-47 language code (e.g., &ldquo;en&rdquo; or &ldquo;en-US&rdquo;)
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_locale_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Language label
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input data-testid="create-project-locale-label-input" placeholder="English" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Human-readable name for the default language</FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button data-testid="create-project-submit-button" disabled={isSubmitDisabled} type="submit">
                {createProject.isPending ? 'Creating...' : 'Create project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
