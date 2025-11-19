import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from 'react-hook-form';

import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/utils/index';

/**
 * Form component provider for react-hook-form integration.
 * Wraps form components with form context from react-hook-form.
 */
const Form = FormProvider;

/**
 * Form field context value interface.
 * Stores the field name for form field context.
 *
 * @template TFieldValues - Type of form field values
 * @template TName - Type of field path
 */
interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

/**
 * FormField component for controlled form fields.
 * Integrates react-hook-form Controller with form field context.
 *
 * @template TFieldValues - Type of form field values
 * @template TName - Type of field path
 * @param {ControllerProps<TFieldValues, TName>} props - React Hook Form Controller props
 *
 * @returns {React.ReactElement} A form field with controller and context provider
 */
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

/**
 * useFormField hook for accessing form field context and state.
 * Provides field state, validation errors, and accessibility IDs.
 *
 * @returns {Object} Form field context including field state, IDs, and name
 * @returns {string} formDescriptionId - ID for form description element
 * @returns {string} formItemId - ID for form item element
 * @returns {string} formMessageId - ID for form message element
 * @returns {string} id - Unique ID for the form item
 * @returns {string} name - Field name from context
 * @returns {FieldState} - Field state from react-hook-form (error, invalid, isDirty, isTouched)
 *
 * @throws {Error} If used outside of FormField component
 */
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    formDescriptionId: `${id}-form-item-description`,
    formItemId: `${id}-form-item`,
    formMessageId: `${id}-form-item-message`,
    id,
    name: fieldContext.name,
    ...fieldState,
  };
};

/**
 * Form item context value interface.
 * Stores the unique ID for form item context.
 */
interface FormItemContextValue {
  id: string;
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

/**
 * FormControl component for form input controls.
 * Wraps form inputs with accessibility attributes and error states using Radix UI Slot.
 *
 * @param {React.ComponentProps<typeof Slot>} props - Radix UI Slot props
 *
 * @returns {React.ReactElement} A Slot element with form control accessibility attributes
 */
function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formDescriptionId, formItemId, formMessageId } = useFormField();

  return (
    <Slot
      aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      data-slot="form-control"
      id={formItemId}
      {...props}
    />
  );
}

/**
 * FormDescription component for form field descriptions.
 * Provides accessible description text for form fields.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'p'>} props - Standard p element props
 *
 * @returns {React.ReactElement} A p element with form description styling and accessibility ID
 */
function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="form-description"
      id={formDescriptionId}
      {...props}
    />
  );
}

/**
 * FormItem component for form field container.
 * Provides context and layout for form field components.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element with form item styling and context provider
 */
function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn('grid gap-2', className)} data-slot="form-item" {...props} />
    </FormItemContext.Provider>
  );
}

/**
 * FormLabel component for form field labels.
 * Integrates with form field context to show error states and link to form controls.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof LabelPrimitive.Root>} props - Radix UI Label root props
 *
 * @returns {React.ReactElement} A Label element with form label styling and error state handling
 */
function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      className={cn('data-[error=true]:text-destructive', className)}
      data-error={!!error}
      data-slot="form-label"
      htmlFor={formItemId}
      {...props}
    />
  );
}

/**
 * FormMessage component for displaying form validation errors.
 * Shows error messages from react-hook-form or custom children content.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'p'>} props - Standard p element props
 *
 * @returns {React.ReactElement | null} A p element with error message styling, or null if no error or content
 */
function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? '') : props.children;

  if (!body) {
    return null;
  }

  return (
    <p className={cn('text-destructive text-sm', className)} data-slot="form-message" id={formMessageId} {...props}>
      {body}
    </p>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
