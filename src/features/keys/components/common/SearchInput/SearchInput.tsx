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
 * Debounced search input with icon for filtering translation keys by name
 *
 * Renders a search field with a leading search icon for filtering items by key name.
 * Utilizes a 300ms debounce to optimize API or filter calls, emitting the value to
 * the parent only after the user pauses typing. Synchronizes internal input state
 * with the external prop value, ensuring controlled input behavior during resets.
 *
 * @param {Object} props - Component props
 * @param {(value: string) => void} props.onChange - Triggered after debounce with the current input value
 * @param {string} [props.placeholder] - Optional placeholder text for the search input (defaults to "Search...")
 * @param {string} props.value - External controlled value for the search input
 *
 * @returns {JSX.Element} Styled search input component with debounce support and icon
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
