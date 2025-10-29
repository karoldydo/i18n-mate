import { SearchIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

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

  const { data: keysData, isFetching: isKeysLoading } = useKeysDefaultView(
    {
      limit: 100,
      offset: 0,
      project_id: projectId,
      search: debouncedSearchTerm || undefined,
    },
    { suspense: false }
  );

  const keys = useMemo(() => keysData?.data || [], [keysData?.data]);

  const handleCheckboxChange = useCallback(
    (keyId: string, checked: boolean) => {
      if (checked) {
        onSelectionChange([...selectedKeyIds, keyId]);
      } else {
        onSelectionChange(selectedKeyIds.filter((id) => id !== keyId));
      }
    },
    [selectedKeyIds, onSelectionChange]
  );

  const handleRadioChange = useCallback(
    (keyId: string) => {
      onSelectionChange([keyId]);
    },
    [onSelectionChange]
  );

  const handleSearchChange = useCallback((changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(changeEvent.target.value);
  }, []);

  const handleSearchKeyDown = useCallback((keyboardEvent: React.KeyboardEvent<HTMLInputElement>) => {
    keyboardEvent.stopPropagation();
  }, []);

  const handleClearSelection = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const selectionStatusText = useMemo(() => {
    if (mode === 'selected') {
      return `${selectedKeyIds.length} key(s) selected`;
    }
    return selectedKeyIds.length === 1 ? '1 key selected' : 'No key selected';
  }, [mode, selectedKeyIds.length]);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search keys..."
          value={searchTerm}
        />
      </div>

      {/* Selection Status */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{selectionStatusText}</p>
        {mode === 'selected' && selectedKeyIds.length > 0 && (
          <button className="text-primary text-xs underline" onClick={handleClearSelection} type="button">
            Clear selection
          </button>
        )}
      </div>

      {/* Keys List */}
      <ScrollArea className="border-border h-[300px] rounded-md border">
        <div className="p-4">
          {isKeysLoading ? (
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
