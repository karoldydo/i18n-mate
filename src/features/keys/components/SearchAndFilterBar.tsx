import { MissingFilterToggle } from './MissingFilterToggle';
import { SearchInput } from './SearchInput';

interface SearchAndFilterBarProps {
  missingOnly: boolean;
  onMissingToggle: (enabled: boolean) => void;
  onSearchChange: (value: string) => void;
  searchValue: string;
}

/**
 * SearchAndFilterBar - Horizontal bar containing search input and missing filter toggle
 *
 * Provides UI for searching keys by name and filtering keys with missing translations.
 */
export function SearchAndFilterBar({
  missingOnly,
  onMissingToggle,
  onSearchChange,
  searchValue,
}: SearchAndFilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <SearchInput onChange={onSearchChange} placeholder="Search keys..." value={searchValue} />
      <MissingFilterToggle enabled={missingOnly} label="Show only missing translations" onToggle={onMissingToggle} />
    </div>
  );
}
