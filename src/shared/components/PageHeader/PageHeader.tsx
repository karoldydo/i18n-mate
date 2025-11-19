import type { ReactNode } from 'react';

interface PageHeaderProps {
  children?: ReactNode;
  header: string;
  subHeading?: null | string;
}

/**
 * PageHeader – Generic, reusable header component for page layouts.
 *
 * Renders a prominent page title and either a subheading or arbitrary custom
 * content beneath it. When `children` are provided, they are rendered in place of
 * the `subHeading` text, enabling flexible header layouts (actions, descriptions, etc).
 *
 * @param {PageHeaderProps} props - Component props
 * @param {string} props.header - The main page title to display in a large heading
 * @param {string | null} [props.subHeading] - Optional subheading text to display below the header.
 *   Ignored if `children` are provided
 * @param {ReactNode} [props.children] - Optional custom content to display below the header.
 *   If provided, this replaces the `subHeading` text
 *
 * @returns {JSX.Element} The rendered page header section with title and optional content
 */
export function PageHeader({ children, header, subHeading }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="page-header-title">
        {header}
      </h1>
      {(children || subHeading) && (
        <div className="flex flex-col gap-1">
          {children ? (
            children
          ) : (
            <p className="text-muted-foreground text-sm sm:text-base" data-testid="page-header-subheading">
              {subHeading}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
