import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { TRANSLATION_VALUE_MAX_LENGTH } from '@/shared/constants';
import { Input } from '@/shared/ui/input';

interface TranslationValueCellProps {
  error?: string;
  isEditing: boolean;
  isSaving: boolean;
  onEditEnd: () => void;
  onEditStart: () => void;
  onValueChange: (value: string) => void;
  value: null | string;
}

const AUTOSAVE_DELAY = 500;

/**
 * TranslationValueCell - Editable cell for translation values with autosave
 *
 * Displays translation value or input field based on editing state. Supports
 * click to edit, autosave after 500ms of inactivity, real-time validation,
 * and visual saving indicators. Allows empty values (NULL) for missing translations.
 */
export function TranslationValueCell({
  error,
  isEditing,
  isSaving,
  onEditEnd,
  onEditStart,
  onValueChange,
  value,
}: TranslationValueCellProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [validationError, setValidationError] = useState<string | undefined>(error);
  const lastSavedValueRef = useRef<null | string>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // sync local value with prop value when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value ?? '');
      setValidationError(undefined);
      lastSavedValueRef.current = value;
    }
  }, [isEditing, value]);

  // sync validation error from props
  useEffect(() => {
    setValidationError(error);
  }, [error]);

  // autosave after delay
  useEffect(() => {
    if (!isEditing || isSaving) return;

    // validate before autosaving
    const trimmed = localValue.trim();

    // validation rules
    let hasError = false;
    if (trimmed.length > TRANSLATION_VALUE_MAX_LENGTH) {
      setValidationError(`Value must be at most ${TRANSLATION_VALUE_MAX_LENGTH} characters`);
      hasError = true;
    } else if (trimmed.includes('\n')) {
      setValidationError('Value cannot contain newlines');
      hasError = true;
    } else {
      setValidationError(undefined);
    }

    // only autosave if no validation errors and value changed from last saved
    const normalizedValue = trimmed || null;
    const lastSavedValue = lastSavedValueRef.current;

    if (!hasError && normalizedValue !== lastSavedValue) {
      const timer = setTimeout(() => {
        lastSavedValueRef.current = normalizedValue;
        onValueChange(trimmed || '');
      }, AUTOSAVE_DELAY);

      return () => clearTimeout(timer);
    }
  }, [localValue, isEditing, isSaving, onValueChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      onEditStart();
    }
  }, [isEditing, onEditStart]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // blur to trigger save immediately
        e.currentTarget.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // cancel editing and revert to original value
        setLocalValue(value ?? '');
        setValidationError(undefined);
        onEditEnd();
      }
    },
    [value, onEditEnd]
  );

  const handleBlur = useCallback(() => {
    const trimmed = localValue.trim();

    // validate before saving
    let hasError = false;
    if (trimmed.length > TRANSLATION_VALUE_MAX_LENGTH) {
      hasError = true;
    } else if (trimmed.includes('\n')) {
      hasError = true;
    }

    // save immediately on blur if there are unsaved changes and no validation errors
    const normalizedValue = trimmed || null;
    if (!hasError && normalizedValue !== lastSavedValueRef.current) {
      lastSavedValueRef.current = normalizedValue;
      onValueChange(trimmed || '');
    }

    // exit edit mode immediately
    onEditEnd();
  }, [localValue, onValueChange, onEditEnd]);

  if (!isEditing) {
    return (
      <div
        className="hover:bg-muted cursor-pointer rounded px-2 py-1 transition-colors"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {value ? <span>{value}</span> : <span className="text-muted-foreground italic">No translation</span>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="relative flex items-center gap-2">
        <Input
          className={validationError ? 'border-destructive pr-8' : 'pr-8'}
          maxLength={TRANSLATION_VALUE_MAX_LENGTH + 10} // allow typing beyond limit for validation
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter translation..."
          ref={inputRef}
          value={localValue}
        />
        {isSaving && (
          <div className="absolute right-2">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        {validationError ? (
          <span className="text-destructive">{validationError}</span>
        ) : (
          <span className="text-muted-foreground">
            {localValue.length}/{TRANSLATION_VALUE_MAX_LENGTH}
            {isSaving && <span className="ml-2">Saving...</span>}
          </span>
        )}
      </div>
    </div>
  );
}
