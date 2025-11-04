import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';

interface MissingFilterToggleProps {
  enabled: boolean;
  label: string;
  onToggle: (enabled: boolean) => void;
}

/**
 * MissingFilterToggle - Toggle switch to filter keys with missing translations
 *
 * Provides a labeled switch for enabling/disabling the missing translations filter.
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
