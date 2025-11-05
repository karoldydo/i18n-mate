import { useMemo } from 'react';
import { useLocation } from 'react-router';

interface BreadcrumbItem {
  href?: string;
  isActive?: boolean;
  label: string;
}

/**
 * Hook to generate breadcrumb items based on the current route
 *
 * @param projectName - Optional project name for display
 * @returns Array of breadcrumb items
 */
export function useBreadcrumbs(projectName?: string): BreadcrumbItem[] {
  const location = useLocation();

  return useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Projects home
    breadcrumbs.push({
      href: '/projects',
      label: 'Projects',
    });

    const segments = location.pathname.split('/').filter(Boolean);

    // if we're on a project page
    if (segments[0] === 'projects' && segments[1]) {
      const projectId = segments[1];

      // add project breadcrumb
      breadcrumbs.push({
        href: `/projects/${projectId}`,
        label: projectName || `${projectId}`,
      });

      // add sub-page breadcrumb if exists
      if (segments[2]) {
        const subPage = segments[2];
        let label = formatPageLabel(subPage);

        // handle nested routes (e.g., /keys/:locale)
        if (segments[3]) {
          label = `${label} - ${segments[3]}`;
        }

        breadcrumbs.push({
          isActive: true,
          label,
        });
      }
    }

    return breadcrumbs;
  }, [location.pathname, projectName]);
}

/**
 * Format a URL segment into a readable label
 *
 * @param segment - URL segment to format
 * @returns Formatted label
 */
function formatPageLabel(segment: string): string {
  // convert kebab-case to title case
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
