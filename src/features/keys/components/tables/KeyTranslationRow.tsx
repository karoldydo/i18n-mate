import type { KeyPerLanguageViewResponse } from '@/shared/types';

import { TranslationStatus } from '@/shared/components/TranslationStatus';
import { TableCell, TableRow } from '@/shared/ui/table';

import { TranslationValueCell } from '../common/TranslationValueCell';

interface KeyTranslationRowProps {
  editError?: string;
  isEditing: boolean;
  isSaving: boolean;
  keyData: KeyPerLanguageViewResponse;
  onEditEnd: () => void;
  onEditStart: () => void;
  onValueChange: (value: string) => void;
}

/**
 * KeyTranslationRow - Table row for a single translation key in per-language view
 *
 * Displays key name (read-only), translation value (editable), and metadata.
 * Supports inline editing with autosave and validation. Shows translation
 * provenance (manual vs machine-translated) and timestamps.
 */
export function KeyTranslationRow({
  editError,
  isEditing,
  isSaving,
  keyData,
  onEditEnd,
  onEditStart,
  onValueChange,
}: KeyTranslationRowProps) {
  return (
    <TableRow>
      {/* Key Cell - Read-only */}
      <TableCell className="font-mono text-sm">{keyData.full_key}</TableCell>

      {/* Translation Value Cell - Editable */}
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

      {/* Metadata Cell */}
      <TableCell>
        <TranslationStatus isMachineTranslated={keyData.is_machine_translated} updatedAt={keyData.updated_at} />
      </TableCell>
    </TableRow>
  );
}
