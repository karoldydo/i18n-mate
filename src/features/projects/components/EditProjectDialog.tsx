import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ProjectWithCounts, UpdateProjectRequest } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

import { UPDATE_PROJECT_SCHEMA } from '../api/projects.schemas';
import { useUpdateProject } from '../api/useUpdateProject';

interface EditProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: ProjectWithCounts;
}

/**
 * EditProjectDialog - Modal dialog for editing existing projects
 *
 * Provides form with validation for updating project name and description only.
 * Prefix and default locale are immutable after project creation.
 */
export function EditProjectDialog({ onOpenChange, open, project }: EditProjectDialogProps) {
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject(project.id);

  const form = useForm<UpdateProjectRequest>({
    defaultValues: {
      description: project.description,
      name: project.name,
    },
    resolver: zodResolver(UPDATE_PROJECT_SCHEMA),
  });

  const { handleSubmit, reset } = form;

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
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project name and description. Prefix and default locale cannot be changed.
          </DialogDescription>
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

            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Prefix:</span>{' '}
                <code className="bg-muted rounded px-2 py-1 text-sm">{project.prefix}</code>
                <span className="text-muted-foreground ml-2">(immutable)</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Default Locale:</span>{' '}
                <code className="bg-muted rounded px-2 py-1 text-sm">{project.default_locale}</code>
                <span className="text-muted-foreground ml-2">(immutable)</span>
              </div>
            </div>

            <DialogFooter>
              <Button disabled={updateProject.isPending} onClick={handleCancel} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={updateProject.isPending} type="submit">
                {updateProject.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
