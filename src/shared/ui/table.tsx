import * as React from 'react';

import { cn } from '@/shared/utils/index';

/**
 * Table component for displaying tabular data.
 * Wraps table element with horizontal scroll container for responsive behavior.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'table'>} props - Standard table element props
 *
 * @returns {React.ReactElement} A table element wrapped in a scrollable container
 */
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-x-auto" data-slot="table-container">
      <table className={cn('w-full caption-bottom text-sm', className)} data-slot="table" {...props} />
    </div>
  );
}

/**
 * TableBody component for table body rows.
 * Removes border from the last row for cleaner appearance.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'tbody'>} props - Standard tbody element props
 *
 * @returns {React.ReactElement} A tbody element styled for table body
 */
function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} data-slot="table-body" {...props} />;
}

/**
 * TableCaption component for table captions.
 * Provides accessible caption text for tables.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'caption'>} props - Standard caption element props
 *
 * @returns {React.ReactElement} A caption element styled for table captions
 */
function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption className={cn('text-muted-foreground mt-4 text-sm', className)} data-slot="table-caption" {...props} />
  );
}

/**
 * TableCell component for table data cells.
 * Supports checkbox alignment and proper spacing.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'td'>} props - Standard td element props
 *
 * @returns {React.ReactElement} A td element styled for table cells
 */
function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      data-slot="table-cell"
      {...props}
    />
  );
}

/**
 * TableFooter component for table footer rows.
 * Provides distinct styling for footer content.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'tfoot'>} props - Standard tfoot element props
 *
 * @returns {React.ReactElement} A tfoot element styled for table footers
 */
function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      data-slot="table-footer"
      {...props}
    />
  );
}

/**
 * TableHead component for table header cells.
 * Provides prominent styling for column headers.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'th'>} props - Standard th element props
 *
 * @returns {React.ReactElement} A th element styled for table headers
 */
function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      data-slot="table-head"
      {...props}
    />
  );
}

/**
 * TableHeader component for table header section.
 * Provides border styling for header rows.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'thead'>} props - Standard thead element props
 *
 * @returns {React.ReactElement} A thead element styled for table headers
 */
function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b', className)} data-slot="table-header" {...props} />;
}

/**
 * TableRow component for table rows.
 * Provides hover and selected state styling.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'tr'>} props - Standard tr element props
 *
 * @returns {React.ReactElement} A tr element styled for table rows with hover and selection states
 */
function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors', className)}
      data-slot="table-row"
      {...props}
    />
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
