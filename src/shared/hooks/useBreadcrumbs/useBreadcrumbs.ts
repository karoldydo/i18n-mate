import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router';

import { useProjectName } from '@/features/projects/api/useProjectName';

interface BreadcrumbItem {
  href?: string;
  isActive?: boolean;
  label: string;
}

interface RouteParams {
  id: string;
}

/**
 * Hook to generate breadcrumb items based on the current route
 *
 * - Automatically extracts projectId from route params using useParams
 * - Fetches project name from TanStack Query cache if projectId is available
 * - Falls back to UUID if project name is not available
 *
 * @param projectName - Optional project name for display (overrides fetched name)
 * @returns Array of breadcrumb items
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const params = useParams<keyof RouteParams>();

  // fetch project name from cache if projectId is available
  const projectName = useProjectName(params.id);

  return useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Projects home
    breadcrumbs.push({
      href: '/projects',
      label: 'Projects',
    });

    const segments = location.pathname.split('/').filter(Boolean);

    // if we're on a project page (has id param)
    if (segments[0] === 'projects' && params.id) {
      // add project breadcrumb
      breadcrumbs.push({
        href: `/projects/${params.id}`,
        label: projectName || params.id,
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
  }, [location.pathname, params.id, projectName]);
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
