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
 * Displays a form for updating project name and description,
 * with validation using react-hook-form and zod.
 *
 * Prefix and default locale fields are immutable after creation and
 * are not editable here.
 *
 * On successful update, the dialog closes and the projects list is invalidated.
 * Shows toast notifications for success or error cases.
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {function(boolean):void} props.onOpenChange - Callback for dialog open state changes
 * @param {ProjectResponse} props.project - Project object being edited
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
