import type { KeyDefaultViewResponse } from '@/shared/types';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { KeyTableRow } from './KeyTableRow';
import { TablePagination } from './TablePagination';

interface KeysDataTableProps {
  editingKeyId: null | string;
  isLoading: boolean;
  keys: KeyDefaultViewResponse[];
  onDeleteKey: (key: KeyDefaultViewResponse) => void;
  onEditCancel: () => void;
  onEditSave: (keyId: string, newValue: string) => void;
  onEditStart: (keyId: string) => void;
  onPageChange: (page: number) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
  };
}

/**
 * KeysDataTable - Data table displaying keys with pagination and inline editing
 *
 * Renders a table with columns for key name, default value, and missing count.
 * Supports inline editing of values, pagination navigation, and key deletion.
 */
export function KeysDataTable({
  editingKeyId,
  isLoading,
  keys,
  onDeleteKey,
  onEditCancel,
  onEditSave,
  onEditStart,
  onPageChange,
  pagination,
}: KeysDataTableProps) {
  // empty state
  if (!isLoading && keys.length === 0) {
    return (
      <div className="border-border rounded-lg border p-12 text-center">
        <p className="text-muted-foreground text-lg">No translation keys found</p>
        <p className="text-muted-foreground mt-2 text-sm">Get started by adding your first translation key</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Key</TableHead>
              <TableHead className="w-[45%]">Default Value</TableHead>
              <TableHead className="w-[10%]">Missing</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => (
              <KeyTableRow
                isEditing={editingKeyId === key.id}
                key={key.id}
                keyData={key}
                onDelete={() => onDeleteKey(key)}
                onEditCancel={onEditCancel}
                onEditSave={(newValue) => onEditSave(key.id, newValue)}
                onEditStart={() => onEditStart(key.id)}
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
