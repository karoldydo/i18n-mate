import { PRIMARY_LOCALES } from '@/shared/constants/locales.constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface LocaleSelectorProps {
  'data-testid'?: string;
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
export function LocaleSelector({
  'data-testid': dataTestId,
  disabled = false,
  onValueChange,
  value,
}: LocaleSelectorProps) {
  return (
    <div data-testid={dataTestId}>
      <Select disabled={disabled} onValueChange={onValueChange} value={value}>
        <SelectTrigger data-testid="locale-selector-trigger">
          <SelectValue placeholder="Select a locale" />
        </SelectTrigger>
        <SelectContent data-testid="locale-selector-content">
          {PRIMARY_LOCALES.map((locale) => (
            <SelectItem data-testid={`locale-option-${locale.code}`} key={locale.code} value={locale.code}>
              {locale.label} ({locale.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
