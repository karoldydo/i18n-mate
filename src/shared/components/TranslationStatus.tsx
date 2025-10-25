import { Bot, User } from 'lucide-react';

import { Badge } from '@/shared/ui/badge';

interface TranslationStatusProps {
  isMachineTranslated: boolean | null;
  updatedAt?: null | string;
}

/**
 * TranslationStatus - Displays translation metadata status
 *
 * Shows whether a translation was created manually or by machine (LLM).
 * Provides consistent visual representation with ARIA labels for accessibility.
 * Used across both default and per-language key views.
 */
export function TranslationStatus({ isMachineTranslated, updatedAt }: TranslationStatusProps) {
  // no metadata available
  if (isMachineTranslated === null) {
    return <span className="text-muted-foreground text-xs italic">No translation</span>;
  }

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="flex items-center gap-2">
      {isMachineTranslated ? (
        <Badge aria-label="Machine translated" className="flex items-center gap-1" variant="secondary">
          <Bot className="h-3 w-3" />
          Machine
        </Badge>
      ) : (
        <Badge aria-label="Manually translated" className="flex items-center gap-1" variant="default">
          <User className="h-3 w-3" />
          Manual
        </Badge>
      )}
      {formattedDate && <span className="text-muted-foreground text-xs">{formattedDate}</span>}
    </div>
  );
}
