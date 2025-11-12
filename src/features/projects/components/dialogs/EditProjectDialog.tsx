import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ProjectResponse, UpdateProjectRequest } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

import { UPDATE_PROJECT_SCHEMA } from '../../api/projects.schemas';
import { useUpdateProject } from '../../api/useUpdateProject';

interface EditProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: ProjectResponse;
}

/**
 * EditProjectDialog – Modal dialog for editing an existing project.
 *
 * Provides a controlled form for updating a project's name and description,
 * leveraging react-hook-form for form state management and Zod for schema validation.
 * Project prefix and default locale are immutable and cannot be changed here.
 *
 * Features:
 * - Pre-populates form fields with the current project's data each time the dialog opens.
 * - Validates inputs in real time, disabling the submit button until valid and not pending.
 * - On submit:
 *    - Calls the update mutation for the project.
 *    - In case of success:
 *        - Invalidates the project list query to ensure up-to-date data.
 *        - Shows a success toast.
 *        - Closes the dialog.
 *    - In case of error:
 *        - Displays a toast notification with an error message.
 * - Form resets when the modal closes and the update is not pending.
 * - Cancel button is disabled during pending mutations for safety.
 *
 * @param {Object} props - Props object
 * @param {boolean} props.open - Controls whether the dialog is displayed
 * @param {(open: boolean) => void} props.onOpenChange - Callback invoked when the dialog open state changes
 * @param {ProjectResponse} props.project - The project object currently being edited
 *
 * @returns {JSX.Element} Modal dialog for editing a project's basic info
 */
export function EditProjectDialog({ onOpenChange, open, project }: EditProjectDialogProps) {
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject(project.id);

  const form = useForm<UpdateProjectRequest>({
    defaultValues: {
      description: project.description,
      name: project.name,
    },
    mode: 'onChange',
    resolver: zodResolver(UPDATE_PROJECT_SCHEMA),
  });

  const { formState, handleSubmit, reset } = form;

  const isSubmitDisabled = useMemo(
    () => updateProject.isPending || !formState.isValid,
    [updateProject.isPending, formState.isValid]
  );

  useEffect(() => {
    if (open) {
      reset({
        description: project.description,
        name: project.name,
      });
    }
  }, [open, project, reset]);

  const onSubmit = useCallback(
    (data: UpdateProjectRequest) => {
      const payload: UpdateProjectRequest = {
        description: data.description || null,
        name: data.name,
      };

      updateProject.mutate(payload, {
        onError: ({ error }) => {
          toast.error(error.message);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          toast.success('Project updated successfully');
          onOpenChange(false);
        },
      });
    },
    [onOpenChange, queryClient, updateProject]
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && !updateProject.isPending) {
        reset();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, reset, updateProject.isPending]
  );

  const handleCancel = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Update project name and description.</DialogDescription>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Project description..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button disabled={updateProject.isPending} onClick={handleCancel} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={isSubmitDisabled} type="submit">
                {updateProject.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
