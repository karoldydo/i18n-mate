import { PRIMARY_LOCALES } from '@/shared/constants/locale.constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface LocaleSelectorProps {
  disabled?: boolean;
  onValueChange: (value: string) => void;
  value?: string;
}

/**
 * LocaleSelector - Dropdown for selecting locale codes
 *
 * Provides a pre-populated list of common primary language subtags (IETF language tags)
 * for selecting the default locale during project creation.
 */
export function LocaleSelector({ disabled = false, onValueChange, value }: LocaleSelectorProps) {
  return (
    <Select disabled={disabled} onValueChange={onValueChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder="Select a locale" />
      </SelectTrigger>
      <SelectContent>
        {PRIMARY_LOCALES.map((locale) => (
          <SelectItem key={locale.code} value={locale.code}>
            {locale.label} ({locale.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
