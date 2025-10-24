import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface LocaleSelectorProps {
  disabled?: boolean;
  onValueChange: (value: string) => void;
  value?: string;
}

/**
 * Common primary language subtags (IETF language tags)
 * Used for default locale selection in project creation
 */
const PRIMARY_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es', label: 'Spanish' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'es-MX', label: 'Spanish (Mexico)' },
  { code: 'fr', label: 'French' },
  { code: 'fr-FR', label: 'French (France)' },
  { code: 'fr-CA', label: 'French (Canada)' },
  { code: 'de', label: 'German' },
  { code: 'de-DE', label: 'German (Germany)' },
  { code: 'de-AT', label: 'German (Austria)' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' },
  { code: 'ar', label: 'Arabic' },
  { code: 'nl', label: 'Dutch' },
  { code: 'sv', label: 'Swedish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'cs', label: 'Czech' },
  { code: 'tr', label: 'Turkish' },
  { code: 'hi', label: 'Hindi' },
];

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
