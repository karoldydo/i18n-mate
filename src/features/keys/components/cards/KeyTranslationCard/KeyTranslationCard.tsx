import type { KeyTranslationItem } from '@/shared/types';

import { TranslationValueCell } from '@/features/keys/components/common/TranslationValueCell';
import { CardItem } from '@/shared/components';
import { TranslationStatus } from '@/shared/components/TranslationStatus';

interface KeyTranslationCardProps {
  editError?: string;
  isEditing: boolean;
  isSaving: boolean;
  keyData: KeyTranslationItem;
  onEditEnd: () => void;
  onEditStart: () => void;
  onValueChange: (value: string) => void;
}

/**
 * Presents an individual translation key's information in a card UI for per-language view
 *
 * Displays key name, editable translation value with inline editing, and translation metadata
 * (manual vs machine-translated, update timestamp). Supports autosave functionality for value editing.
 *
 * Layout:
 * - Key name (full_key) in monospace font
 * - Editable translation value with inline editing support
 * - Translation metadata (manual/machine, update timestamp)
 *
 * @param {Object} props - Component props
 * @param {KeyTranslationItem} props.keyData - The translation key data to display
 * @param {boolean} props.isEditing - Whether this key is currently being edited
 * @param {boolean} props.isSaving - Whether the key value is being saved
 * @param {string} [props.editError] - Error message if editing failed
 * @param {() => void} props.onEditStart - Called when editing starts
 * @param {() => void} props.onEditEnd - Called when editing ends
 * @param {(value: string) => void} props.onValueChange - Called when the value changes (autosave)
 *
 * @returns {JSX.Element} Card structure displaying key name, editable translation value, and metadata
 */
export function KeyTranslationCard({
  editError,
  isEditing,
  isSaving,
  keyData,
  onEditEnd,
  onEditStart,
  onValueChange,
}: KeyTranslationCardProps) {
  return (
    <CardItem data-testid={`key-translation-card-${keyData.key_id ?? ''}`}>
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

        {/* key name and translation status in one line */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs sm:justify-start">
          {/* key name */}
          <div className="flex items-center gap-2">
            <code
              className="bg-muted rounded px-2 py-0.5 font-mono font-medium"
              data-testid={`key-name-${keyData.key_id ?? ''}`}
            >
              {keyData.full_key}
            </code>
          </div>

          {/* translation status */}
          <div className="flex items-center gap-2">
            <TranslationStatus
              isMachineTranslated={keyData.is_machine_translated}
              updatedAt={keyData.updated_at ?? undefined}
            />
          </div>
        </div>
      </div>
    </CardItem>
  );
}
