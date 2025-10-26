import { SearchIcon } from 'lucide-react';
import { useState } from 'react';

import type { TranslationMode } from '@/shared/types';

import { useDebounce } from '@/shared/hooks';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { ScrollArea } from '@/shared/ui/scroll-area';

import { useKeysDefaultView } from '../../keys/api';

interface KeySelectorProps {
  mode: TranslationMode;
  onSelectionChange: (keyIds: string[]) => void;
  projectId: string;
  selectedKeyIds: string[];
}

/**
 * KeySelector - Component for selecting translation keys
 *
 * Supports two modes:
 * - selected: Multi-select with checkboxes
 * - single: Single-select with radio buttons
 *
 * Features:
 * - Search/filter keys by name
 * - Scrollable list of keys
 * - Shows key count and selection status
 */
export function KeySelector({ mode, onSelectionChange, projectId, selectedKeyIds }: KeySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // fetch keys with search
  const { data: keysData, isLoading } = useKeysDefaultView({
    limit: 100, // fetch more keys for selection
    offset: 0,
    project_id: projectId,
    search: debouncedSearchTerm || undefined,
  });

  const keys = keysData?.data || [];

  // handle checkbox toggle (multi-select)
  const handleCheckboxChange = (keyId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedKeyIds, keyId]);
    } else {
      onSelectionChange(selectedKeyIds.filter((id) => id !== keyId));
    }
  };

  // handle radio select (single-select)
  const handleRadioChange = (keyId: string) => {
    onSelectionChange([keyId]);
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            // prevent dialog-level typeahead or shortcuts from stealing focus while typing
            e.stopPropagation();
          }}
          placeholder="Search keys..."
          value={searchTerm}
        />
      </div>

      {/* Selection Status */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {mode === 'selected'
            ? `${selectedKeyIds.length} key(s) selected`
            : selectedKeyIds.length === 1
              ? '1 key selected'
              : 'No key selected'}
        </p>
        {mode === 'selected' && selectedKeyIds.length > 0 && (
          <button className="text-primary text-xs underline" onClick={() => onSelectionChange([])} type="button">
            Clear selection
          </button>
        )}
      </div>

      {/* Keys List */}
      <ScrollArea className="border-border h-[300px] rounded-md border">
        <div className="p-4">
          {isLoading ? (
            <p className="text-muted-foreground text-center text-sm">Loading keys...</p>
          ) : keys.length === 0 ? (
            searchTerm ? (
              <p className="text-muted-foreground text-center text-sm">
                No keys found matching &quot;{searchTerm}&quot;
              </p>
            ) : (
              <p className="text-muted-foreground text-center text-sm">
                No keys available. Add translation keys in the Keys section first.
              </p>
            )
          ) : mode === 'selected' ? (
            // Multi-select with checkboxes
            <div className="space-y-3">
              {keys.map((key) => {
                const isChecked = selectedKeyIds.includes(key.id);
                return (
                  <div className="flex items-start space-x-3" key={key.id}>
                    <Checkbox
                      checked={isChecked}
                      id={`key-${key.id}`}
                      onCheckedChange={(checked) => handleCheckboxChange(key.id, checked as boolean)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        htmlFor={`key-${key.id}`}
                      >
                        {key.full_key}
                      </Label>
                      <p className="text-muted-foreground line-clamp-2 text-xs">{key.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Single-select with radio buttons
            <RadioGroup onValueChange={handleRadioChange} value={selectedKeyIds[0] || ''}>
              <div className="space-y-3">
                {keys.map((key) => (
                  <div className="flex items-start space-x-3" key={key.id}>
                    <RadioGroupItem id={`key-${key.id}`} value={key.id} />
                    <div className="flex-1 space-y-1">
                      <Label
                        className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        htmlFor={`key-${key.id}`}
                      >
                        {key.full_key}
                      </Label>
                      <p className="text-muted-foreground line-clamp-2 text-xs">{key.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>
      </ScrollArea>

      {/* Info */}
      {keys.length >= 100 && (
        <p className="text-muted-foreground text-xs">Showing first 100 keys. Use search to find more specific keys.</p>
      )}
    </div>
  );
}
