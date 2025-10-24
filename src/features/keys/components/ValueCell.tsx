import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { TRANSLATION_VALUE_MAX_LENGTH } from '@/shared/constants';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

interface ValueCellProps {
  error?: string;
  isEditing: boolean;
  onCancel: () => void;
  onEditStart: () => void;
  onSave: (newValue: string) => void;
  value: string;
}

/**
 * ValueCell - Editable cell component for key values with inline editing
 *
 * Displays value text or input field based on editing state. Supports double-click
 * to edit, Enter/Escape keys for save/cancel, and character limit validation.
 */
export function ValueCell({ error, isEditing, onCancel, onEditStart, onSave, value }: ValueCellProps) {
  const [localValue, setLocalValue] = useState(value);
  const [validationError, setValidationError] = useState<string | undefined>(error);

  // sync local value with prop value when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
      setValidationError(undefined);
    }
  }, [isEditing, value]);

  const handleSave = useCallback(() => {
    const trimmed = localValue.trim();

    // validation
    if (!trimmed) {
      setValidationError('Value cannot be empty');
      return;
    }

    if (trimmed.length > TRANSLATION_VALUE_MAX_LENGTH) {
      setValidationError(`Value must be at most ${TRANSLATION_VALUE_MAX_LENGTH} characters`);
      return;
    }

    if (trimmed.includes('\n')) {
      setValidationError('Value cannot contain newlines');
      return;
    }

    onSave(trimmed);
    setValidationError(undefined);
  }, [localValue, onSave]);

  const handleCancel = useCallback(() => {
    setLocalValue(value);
    setValidationError(undefined);
    onCancel();
  }, [value, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (!isEditing) {
    return (
      <div
        className="hover:bg-muted cursor-pointer rounded px-2 py-1"
        onDoubleClick={onEditStart}
        role="button"
        tabIndex={0}
      >
        {value}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          className={validationError ? 'border-destructive' : ''}
          maxLength={TRANSLATION_VALUE_MAX_LENGTH}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          value={localValue}
        />
        <Button onClick={handleSave} size="sm" variant="ghost">
          <Check className="h-4 w-4" />
          <span className="sr-only">Save</span>
        </Button>
        <Button onClick={handleCancel} size="sm" variant="ghost">
          <X className="h-4 w-4" />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>
      <div className="flex items-center justify-between text-xs">
        {validationError ? (
          <span className="text-destructive">{validationError}</span>
        ) : (
          <span className="text-muted-foreground">
            {localValue.length}/{TRANSLATION_VALUE_MAX_LENGTH}
          </span>
        )}
      </div>
    </div>
  );
}
