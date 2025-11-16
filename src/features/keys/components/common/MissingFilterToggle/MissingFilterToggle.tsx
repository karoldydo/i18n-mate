import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';

interface MissingFilterToggleProps {
  enabled: boolean;
  label: string;
  onToggle: (enabled: boolean) => void;
}

/**
 * MissingFilterToggle – Labeled toggle switch for filtering translation keys with missing translations.
 *
 * Renders a labeled switch UI for enabling or disabling a filter that limits the view
 * to keys missing translations. Used in translation key lists to quickly show or hide missing items.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.enabled - Whether the missing filter is currently enabled
 * @param {string} props.label - Label text describing the filter toggle
 * @param {(enabled: boolean) => void} props.onToggle - Callback fired when the switch is toggled
 *
 * @returns {JSX.Element} Toggle switch with label for filtering missing translation keys.
 *
 * @example
 * <MissingFilterToggle
 *   enabled={missingOnly}
 *   label="Show only missing translations"
 *   onToggle={setMissingOnly}
 * />
 */
export function MissingFilterToggle({ enabled, label, onToggle }: MissingFilterToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={enabled} id="missing-filter" onCheckedChange={onToggle} />
      <Label className="cursor-pointer text-sm font-normal" htmlFor="missing-filter">
        {label}
      </Label>
    </div>
  );
}
