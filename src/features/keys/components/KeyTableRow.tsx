import { MoreHorizontal, Trash2 } from 'lucide-react';

import type { KeyDefaultViewResponse } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { TableCell, TableRow } from '@/shared/ui/table';

import { TranslationValueCell } from './TranslationValueCell';

interface KeyTableRowProps {
  editError?: string;
  isEditing: boolean;
  isSaving: boolean;
  keyData: KeyDefaultViewResponse;
  onDelete: () => void;
  onEditEnd: () => void;
  onEditStart: () => void;
  onValueChange: (newValue: string) => void;
}

/**
 * KeyTableRow - Individual table row representing a single key with inline editing
 *
 * Displays key name, editable value cell with autosave, missing count, and action menu.
 * Supports inline editing for values with autosave functionality.
 */
export function KeyTableRow({
  editError,
  isEditing,
  isSaving,
  keyData,
  onDelete,
  onEditEnd,
  onEditStart,
  onValueChange,
}: KeyTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{keyData.full_key}</TableCell>
      <TableCell>
        <TranslationValueCell
          error={editError}
          isEditing={isEditing}
          isSaving={isSaving}
          onEditEnd={onEditEnd}
          onEditStart={onEditStart}
          onValueChange={onValueChange}
          value={keyData.value}
        />
      </TableCell>
      <TableCell>
        {keyData.missing_count > 0 ? (
          <span className="text-destructive font-medium">{keyData.missing_count}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
