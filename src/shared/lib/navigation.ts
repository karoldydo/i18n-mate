import { BarChart3, Download, FileText, Home, Key, Languages, type LucideIcon } from 'lucide-react';

/**
 * Represents a navigation item in the application sidebar or navigation menu.
 * Contains properties for routing, display, and optional state indicators.
 */
export interface NavigationItem {
  badge?: number | string;
  href: string;
  icon: LucideIcon;
  id: string;
  isActive?: boolean;
  label: string;
}

/**
 * Global navigation items accessible from any page in the application.
 *
 * @returns {NavigationItem[]} Array of navigation items available globally
 */
export const GLOBAL_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: '/projects',
    icon: Home,
    id: 'projects',
    label: 'Projects',
  },
];

/**
 * Generates project-specific navigation items based on the provided project ID.
 *
 * @param {string} [id] - The UUID of the current project
 *
 * @returns {NavigationItem[]} Array of navigation items for the project, or empty array if no ID is provided
 */
export function getProjectNavigationItems(id?: string): NavigationItem[] {
  if (!id) return [];

  return [
    {
      href: `/projects/${id}/keys`,
      icon: Key,
      id: 'keys',
      label: 'Keys',
    },
    {
      href: `/projects/${id}/locales`,
      icon: Languages,
      id: 'locales',
      label: 'Locales',
    },
    {
      href: `/projects/${id}/translation-jobs`,
      icon: FileText,
      id: 'translation-jobs',
      label: 'Translation Jobs',
    },
    {
      href: `/projects/${id}/telemetry`,
      icon: BarChart3,
      id: 'telemetry',
      label: 'Telemetry',
    },
    {
      href: `/projects/${id}/export`,
      icon: Download,
      id: 'export',
      label: 'Export',
    },
  ];
}
