import { MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react';
import { memo, useCallback } from 'react';

import type { ProjectLocaleWithDefault } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

interface LocaleRowProps {
  locale: ProjectLocaleWithDefault;
  onDelete: (locale: ProjectLocaleWithDefault) => void;
  onEdit: (locale: ProjectLocaleWithDefault) => void;
  onRowClick: (locale: ProjectLocaleWithDefault) => void;
}

interface LocalesDataTableProps {
  locales: ProjectLocaleWithDefault[];
  onDelete: (locale: ProjectLocaleWithDefault) => void;
  onEdit: (locale: ProjectLocaleWithDefault) => void;
  onRowClick: (locale: ProjectLocaleWithDefault) => void;
}

const LocaleRow = memo(function LocaleRow({ locale, onDelete, onEdit, onRowClick }: LocaleRowProps) {
  const handleRowClick = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>) => {
      if ((event.target as HTMLElement).closest('[data-action-cell]')) {
        return;
      }
      onRowClick(locale);
    },
    [onRowClick, locale]
  );

  const handleRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onRowClick(locale);
      }
    },
    [onRowClick, locale]
  );

  const handleEditClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      onEdit(locale);
    },
    [onEdit, locale]
  );

  const handleDeleteClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (!locale.is_default) {
        onDelete(locale);
      }
    },
    [onDelete, locale]
  );

  return (
    <TableRow
      aria-label={`View keys for ${locale.label}`}
      className="cursor-pointer"
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      role="button"
      tabIndex={0}
    >
      <TableCell className="font-mono font-medium">{locale.locale}</TableCell>
      <TableCell>{locale.label}</TableCell>
      <TableCell>
        {locale.is_default && (
          <div aria-label="Default language" className="flex items-center gap-1.5">
            <Star aria-hidden="true" className="h-4 w-4 fill-current text-yellow-500" />
            <span className="text-xs font-medium">Default</span>
          </div>
        )}
      </TableCell>
      <TableCell data-action-cell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="Open menu" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil aria-hidden="true" className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              aria-label={locale.is_default ? 'Cannot delete default language' : `Delete ${locale.label}`}
              className="text-destructive focus:text-destructive"
              disabled={locale.is_default}
              onClick={handleDeleteClick}
            >
              <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

/**
 * LocalesDataTable - Data table displaying project locales
 *
 * Displays project locales with sorting, actions, and navigation capabilities.
 * Highlights default locale and prevents deletion of default locale.
 */
export const LocalesDataTable = memo(function LocalesDataTable({
  locales,
  onDelete,
  onEdit,
  onRowClick,
}: LocalesDataTableProps) {
  if (locales.length === 0) {
    return (
      <div aria-live="polite" className="rounded-md border p-8 text-center" role="status">
        <p className="text-muted-foreground">No languages found. Add your first language to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table aria-label="Project languages">
        <TableHeader>
          <TableRow>
            <TableHead>Locale</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Default</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locales.map((locale) => (
            <LocaleRow key={locale.id} locale={locale} onDelete={onDelete} onEdit={onEdit} onRowClick={onRowClick} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
