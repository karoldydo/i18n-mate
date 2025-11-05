import { useMemo } from 'react';
import { useLocation } from 'react-router';

import type { NavigationItem } from '@/shared/lib/navigation';

/**
 * Hook to calculate active state for navigation items based on current route
 *
 * @param items - Array of navigation items
 * @returns Array of navigation items with updated isActive property
 */
export function useActiveNavigation(items: NavigationItem[]): NavigationItem[] {
  const location = useLocation();

  return useMemo(
    () =>
      items.map((item) => ({
        ...item,
        isActive: location.pathname === item.href || location.pathname.startsWith(`${item.href}/`),
      })),
    [items, location.pathname]
  );
}
