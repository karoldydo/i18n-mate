import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

const formSchema = z.object({
  defaultValue: z.string().min(1, 'Default value is required').max(250, 'Value must be at most 250 characters'),
  keyName: z.string().min(1, 'Key name is required'),
});

type FormData = z.infer<typeof formSchema>;

interface KeyFormProps {
  isSubmitting: boolean;
  onSubmit: (data: { defaultValue: string; fullKey: string }) => void;
  projectPrefix: string;
}

/**
 * KeyForm - Form component within AddKeyDialog for key creation
 *
 * Provides input fields for key name and default value with real-time validation.
 * Pre-populates the key input with project prefix for user convenience.
 */
export function KeyForm({ isSubmitting, onSubmit, projectPrefix }: KeyFormProps) {
  const form = useForm<FormData>({
    defaultValues: {
      defaultValue: '',
      keyName: '',
    },
    mode: 'onChange',
    resolver: zodResolver(formSchema),
  });
  const { control, formState, handleSubmit: formHandleSubmit } = form;

  const handleSubmit = useCallback(
    (data: FormData) => {
      onSubmit({
        defaultValue: data.defaultValue,
        fullKey: `${projectPrefix}.${data.keyName}`,
      });
    },
    [onSubmit, projectPrefix]
  );

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={formHandleSubmit(handleSubmit)}>
        <FormField
          control={control}
          name="keyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key Name</FormLabel>
              <div className="flex items-center gap-2">
                <div className="w-20">
                  <Input disabled value={projectPrefix} />
                </div>
                <span className="text-muted-foreground">.</span>
                <FormControl>
                  <Input {...field} placeholder="home.title" />
                </FormControl>
              </div>
              <FormDescription>Use lowercase letters, numbers, dots, underscores, and hyphens.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="defaultValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Value</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter the default translation value" rows={3} />
              </FormControl>
              <FormDescription>
                The translation value in your project&#39;s default language (max 250 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button disabled={!formState.isValid || isSubmitting} type="submit">
            {isSubmitting ? 'Creating...' : 'Create Key'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
