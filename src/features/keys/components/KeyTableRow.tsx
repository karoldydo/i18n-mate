import { MoreHorizontal, Trash2 } from 'lucide-react';

import type { KeyDefaultViewResponse } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { TableCell, TableRow } from '@/shared/ui/table';

import { ValueCell } from './ValueCell';

interface KeyTableRowProps {
  isEditing: boolean;
  keyData: KeyDefaultViewResponse;
  onDelete: () => void;
  onEditCancel: () => void;
  onEditSave: (newValue: string) => void;
  onEditStart: () => void;
}

/**
 * KeyTableRow - Individual table row representing a single key with inline editing
 *
 * Displays key name, editable value cell, missing count, and action menu.
 * Supports inline editing for values with save/cancel actions.
 */
export function KeyTableRow({ isEditing, keyData, onDelete, onEditCancel, onEditSave, onEditStart }: KeyTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{keyData.full_key}</TableCell>
      <TableCell>
        <ValueCell
          isEditing={isEditing}
          onCancel={onEditCancel}
          onEditStart={onEditStart}
          onSave={onEditSave}
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
