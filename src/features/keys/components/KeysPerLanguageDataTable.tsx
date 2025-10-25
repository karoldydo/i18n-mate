import type { KeyPerLanguageViewResponse } from '@/shared/types';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { KeyTranslationRow } from './KeyTranslationRow';
import { TablePagination } from './TablePagination';

interface KeysPerLanguageDataTableProps {
  editError?: string;
  editingKeyId: null | string;
  isLoading: boolean;
  isSaving: boolean;
  keys: KeyPerLanguageViewResponse[];
  onEditEnd: () => void;
  onEditSave: (keyId: string, value: string) => void;
  onEditStart: (keyId: string) => void;
  onPageChange: (page: number) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
  };
}

/**
 * KeysPerLanguageDataTable - Data table for per-language keys view
 *
 * Displays keys with their translation values and metadata for the selected language.
 * Supports pagination and inline editing with autosave. Shows translation provenance
 * (manual vs machine-translated) and timestamps.
 */
export function KeysPerLanguageDataTable({
  editError,
  editingKeyId,
  isLoading,
  isSaving,
  keys,
  onEditEnd,
  onEditSave,
  onEditStart,
  onPageChange,
  pagination,
}: KeysPerLanguageDataTableProps) {
  // empty state
  if (!isLoading && keys.length === 0) {
    return (
      <div className="border-border rounded-lg border p-12 text-center">
        <p className="text-muted-foreground text-lg">No translation keys found</p>
        <p className="text-muted-foreground mt-2 text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Key</TableHead>
              <TableHead className="w-[50%]">Translation Value</TableHead>
              <TableHead className="w-[20%]">Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => (
              <KeyTranslationRow
                editError={editingKeyId === key.key_id ? editError : undefined}
                isEditing={editingKeyId === key.key_id}
                isSaving={editingKeyId === key.key_id && isSaving}
                key={key.key_id ?? undefined}
                keyData={key}
                onEditEnd={onEditEnd}
                onEditStart={() => onEditStart(key.key_id ?? '')}
                onValueChange={(value) => onEditSave(key.key_id ?? '', value)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {pagination.totalPages > 1 && (
        <TablePagination
          currentPage={pagination.currentPage}
          onPageChange={onPageChange}
          totalPages={pagination.totalPages}
        />
      )}
    </div>
  );
}
