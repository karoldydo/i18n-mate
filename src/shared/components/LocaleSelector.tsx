import { PRIMARY_LOCALES } from '@/shared/constants/locales.constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface LocaleSelectorProps {
  'data-testid'?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  value?: string;
}

/**
 * LocaleSelector – Accessible dropdown for selecting a locale code.
 *
 * Renders a dropdown menu populated with a curated list of primary language sub-tags
 * (IETF BCP 47 codes with language and region), intended for user selection of a default
 * locale (for example, during project creation or configuration).
 *
 * Integrates with shadcn/ui Select components for accessibility, form handling, and keyboard support.
 *
 * @component
 * @param {object} props - Component props
 * @param {string} [props.data-testid] - Optional test ID for querying in tests
 * @param {boolean} [props.disabled] - Disables the selector when true
 * @param {function(string):void} props.onValueChange - Callback when a locale is selected
 * @param {string} [props.value] - Currently selected locale code
 *
 * @example
 *   <LocaleSelector value="en-US" onValueChange={console.log} />
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
          <SelectValue placeholder="Select language" />
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
