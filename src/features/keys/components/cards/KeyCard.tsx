import { MoreVertical, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import type { KeyDefaultViewItem } from '@/shared/types';

import { CardItem } from '@/shared/components';
import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';

import { TranslationValueCell } from '../common/TranslationValueCell';

interface KeyCardProps {
  editError?: string;
  isEditing: boolean;
  isSaving: boolean;
  keyData: KeyDefaultViewItem;
  onDelete: () => void;
  onEditEnd: () => void;
  onEditStart: () => void;
  onValueChange: (value: string) => void;
}

/**
 * KeyCard – Presents an individual translation key's information and actions in a card UI.
 *
 * Displays key name, editable default value with inline editing, missing translation count,
 * and delete action. Supports autosave functionality for value editing.
 *
 * @param {Object} props - Component props
 * @param {KeyDefaultViewItem} props.keyData - The key data to display
 * @param {boolean} props.isEditing - Whether this key is currently being edited
 * @param {boolean} props.isSaving - Whether the key value is being saved
 * @param {string} [props.editError] - Error message if editing failed
 * @param {() => void} props.onDelete - Called when the Delete action is clicked
 * @param {() => void} props.onEditStart - Called when editing starts
 * @param {() => void} props.onEditEnd - Called when editing ends
 * @param {(value: string) => void} props.onValueChange - Called when the value changes (autosave)
 *
 * @returns {JSX.Element} Card structure displaying key name, editable value, missing count, and actions.
 *
 * @example
 * <KeyCard
 *   keyData={key}
 *   isEditing={editingKeyId === key.id}
 *   isSaving={isSaving && editingKeyId === key.id}
 *   editError={editError}
 *   onDelete={handleDelete}
 *   onEditStart={handleEditStart}
 *   onEditEnd={handleEditEnd}
 *   onValueChange={handleValueChange}
 * />
 *
 * Layout:
 * - Key name (full_key) in monospace font
 * - Editable default value with inline editing support
 * - Missing translation count
 * - Actions: Delete option via dropdown menu
 */
export function KeyCard({
  editError,
  isEditing,
  isSaving,
  keyData,
  onDelete,
  onEditEnd,
  onEditStart,
  onValueChange,
}: KeyCardProps) {
  const handleDeleteClick = useCallback(() => {
    onDelete();
  }, [onDelete]);

  return (
    <CardItem
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`Actions for ${keyData.full_key}`} size="icon" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={handleDeleteClick}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      data-testid={`key-card-${keyData.id}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* translation value cell */}
        <div className="min-w-0 flex-1">
          <TranslationValueCell
            error={editError}
            isEditing={isEditing}
            isSaving={isSaving}
            onEditEnd={onEditEnd}
            onEditStart={onEditStart}
            onValueChange={onValueChange}
            value={keyData.value}
          />
        </div>

        {/* key name and missing count in one line */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* key name */}
          <div className="flex items-center gap-2">
            <code className="bg-muted rounded px-2 py-0.5 font-mono font-medium" data-testid={`key-name-${keyData.id}`}>
              {keyData.full_key}
            </code>
          </div>

          {/* missing count */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Missing</span>
            {keyData.missing_count > 0 ? (
              <code
                className="bg-muted text-destructive rounded px-2 py-0.5 font-medium"
                data-testid={`key-missing-count-${keyData.id}`}
              >
                {keyData.missing_count}
              </code>
            ) : (
              <code
                className="bg-muted rounded px-2 py-0.5 font-medium"
                data-testid={`key-missing-count-${keyData.id}`}
              >
                0
              </code>
            )}
          </div>
        </div>
      </div>
    </CardItem>
  );
}
