import { Home } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router';

import { useBreadcrumbs } from '@/shared/hooks/useBreadcrumbs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';

interface BreadcrumbNavigationProps {
  projectName?: string;
}

/**
 * BreadcrumbNavigation renders a responsive breadcrumb navigation bar
 * based on the current route hierarchy and optional project name.
 *
 * - Automatically generates breadcrumb items from the active route structure
 * - Supports displaying the current project name within the breadcrumbs
 * - Shows a home icon for the root breadcrumb
 * - Skips rendering breadcrumbs on the root/projects page (single-level path)
 * - Clearly indicates the current page (active) in the breadcrumb trail
 *
 * @param {Object} props
 * @param {string} [props.projectName] - Optional project name to display in the breadcrumbs
 *
 * @returns {JSX.Element|null} The breadcrumb navigation, or null if not required for the current route
 */
export function BreadcrumbNavigation({ projectName }: BreadcrumbNavigationProps) {
  const breadcrumbs = useBreadcrumbs(projectName);

  // don't show breadcrumbs on root/projects page
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <Fragment key={`breadcrumb-${index}`}>
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="flex items-center gap-1">
                    {index === 0 && <Home className="size-3.5" />}
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link className="flex items-center gap-1" to={item.href}>
                      {index === 0 && <Home className="size-3.5" />}
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
