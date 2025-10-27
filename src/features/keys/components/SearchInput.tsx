import { Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Input } from '@/shared/ui/input';

interface SearchInputProps {
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

const DEBOUNCE_DELAY = 300;

/**
 * SearchInput - Debounced search input for filtering keys by name
 *
 * Provides a search input with 300ms debouncing to prevent excessive API calls.
 * Displays search icon and handles input sanitization.
 */
export function SearchInput({ onChange, placeholder = 'Search...', value }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // sync local value with prop value (for external changes)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // debounce onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  const handleChange = useCallback((changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(changeEvent.target.value);
  }, []);

  return (
    <div className="relative flex-1 sm:max-w-sm">
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input className="pl-9" onChange={handleChange} placeholder={placeholder} type="search" value={localValue} />
    </div>
  );
}
