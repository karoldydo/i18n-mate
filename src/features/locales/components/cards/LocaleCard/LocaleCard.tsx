import { MoreVertical, Pencil, Star, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import type { LocaleItem } from '@/shared/types';

import { CardItem } from '@/shared/components';
import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';

interface LocaleCardProps {
  locale: LocaleItem;
  onDelete: (locale: LocaleItem) => void;
  onEdit: (locale: LocaleItem) => void;
  onNavigate: (locale: LocaleItem) => void;
}

/**
 * LocaleCard – Presents an individual locale's information and actions in a card UI
 *
 * Displays locale code, language label, default indicator, and action dropdown.
 * Card click navigates to keys view for that locale. Edit and Delete actions
 * are available via dropdown menu, with Delete disabled for default locale.
 *
 * @param {LocaleCardProps} props - Component props
 * @param {LocaleItem} props.locale - The locale data to display
 * @param {(locale: LocaleItem) => void} props.onNavigate - Called when the card is clicked, to navigate to the locale keys route
 * @param {(locale: LocaleItem) => void} props.onEdit - Called when the Edit action is clicked (passes the locale)
 * @param {(locale: LocaleItem) => void} props.onDelete - Called when the Delete action is clicked (passes the locale)
 *
 * @returns {JSX.Element} Card structure displaying locale code, label, default indicator, and action dropdown
 */
export function LocaleCard({ locale, onDelete, onEdit, onNavigate }: LocaleCardProps) {
  const handleClick = useCallback(() => {
    onNavigate(locale);
  }, [onNavigate, locale]);

  const handleEditClick = useCallback(() => {
    onEdit(locale);
  }, [onEdit, locale]);

  const handleDeleteClick = useCallback(() => {
    if (!locale.is_default) {
      onDelete(locale);
    }
  }, [onDelete, locale]);

  return (
    <CardItem
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`Actions for ${locale.label}`} size="icon" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              aria-label={locale.is_default ? 'Cannot delete default language' : `Delete ${locale.label}`}
              className="text-destructive focus:text-destructive"
              disabled={locale.is_default}
              onClick={handleDeleteClick}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      data-testid={`locale-card-${locale.id}`}
      onClick={handleClick}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* language label */}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold" data-testid={`locale-label-${locale.id}`}>
            {locale.label}
          </h3>
        </div>

        {/* locale code and default indicator */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* locale code */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Locale</span>
            <code
              className="bg-muted rounded px-2 py-0.5 font-mono font-medium"
              data-testid={`locale-code-${locale.id}`}
            >
              {locale.locale}
            </code>
          </div>

          {/* default indicator */}
          {locale.is_default && (
            <div aria-label="Default language" className="flex items-center gap-1.5">
              <Star aria-hidden="true" className="h-4 w-4 fill-current text-yellow-500" />
              <span className="font-medium">Default</span>
            </div>
          )}
        </div>
      </div>
    </CardItem>
  );
}
