import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

// Extract the schema for the form (without project_id which will be added later)
const formSchema = z.object({
  defaultValue: z.string().min(1, 'Default value is required').max(250, 'Value must be at most 250 characters'),
  fullKey: z.string().min(1, 'Key is required'),
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
      fullKey: `${projectPrefix}.`,
    },
    resolver: zodResolver(formSchema),
  });

  const handleSubmit = (data: FormData) => {
    onSubmit({
      defaultValue: data.defaultValue,
      fullKey: data.fullKey,
    });
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="fullKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder={`${projectPrefix}.home.title`} />
              </FormControl>
              <FormDescription>
                Use lowercase letters, numbers, dots, underscores, and hyphens. Must start with &#34;{projectPrefix}
                &#34;.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
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
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating...' : 'Create Key'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
