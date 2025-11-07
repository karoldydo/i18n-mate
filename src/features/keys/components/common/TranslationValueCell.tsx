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
 * TranslationValueCell – Editable cell for translation string values with autosave.
 *
 * Renders either a static translation value or an input field depending on edit mode.
 * - Allows users to click to enter edit mode.
 * - In edit mode, supports autosaving the translation after 500ms of inactivity (debounced).
 * - Runs real-time validation: value must not exceed TRANSLATION_VALUE_MAX_LENGTH, and must not contain newlines.
 * - Displays validation errors inline and disables autosave on error.
 * - Shows a visual indicator when the value is being saved (spinner and "Saving..." label).
 * - Treats empty/whitespace-only strings as missing translations (null on backend).
 *
 * @param {Object} props - Translation value cell props.
 * @param {string}   [props.error]         - Optional validation error to display externally.
 * @param {boolean}   props.isEditing      - If true, renders input for editing; otherwise, renders value/placeholder.
 * @param {boolean}   props.isSaving       - If true, shows saving indicator/spinner.
 * @param {() => void} props.onEditEnd     - Callback to leave edit mode (blur or escape).
 * @param {() => void} props.onEditStart   - Callback to enter edit mode.
 * @param {(val: string) => void} props.onValueChange - Callback when value should be saved (after debounce or blur).
 * @param {string | null} props.value      - The current translation value to display.
 *
 * @returns {JSX.Element} A cell UI for editing or displaying a translation string, with autosave and immediate validation.
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

  const handleChange = useCallback((changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(changeEvent.target.value);
  }, []);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      onEditStart();
    }
  }, [isEditing, onEditStart]);

  const handleKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent<HTMLInputElement>) => {
      if (keyboardEvent.key === 'Enter') {
        keyboardEvent.preventDefault();
        keyboardEvent.currentTarget.blur();
      } else if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        setLocalValue(value ?? '');
        setValidationError(undefined);
        onEditEnd();
      }
    },
    [value, onEditEnd]
  );

  const handleBlur = useCallback(() => {
    const trimmed = localValue.trim();

    let hasError = false;
    if (trimmed.length > TRANSLATION_VALUE_MAX_LENGTH) {
      hasError = true;
    } else if (trimmed.includes('\n')) {
      hasError = true;
    }

    const normalizedValue = trimmed || null;
    if (!hasError && normalizedValue !== lastSavedValueRef.current) {
      lastSavedValueRef.current = normalizedValue;
      onValueChange(trimmed || '');
    }

    onEditEnd();
  }, [localValue, onValueChange, onEditEnd]);

  const handleViewKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  if (!isEditing) {
    return (
      <div
        className="hover:bg-muted cursor-pointer rounded px-2 py-1 transition-colors"
        onClick={handleClick}
        onKeyDown={handleViewKeyDown}
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
