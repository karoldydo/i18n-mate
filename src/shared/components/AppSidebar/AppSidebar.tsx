import { type ComponentProps } from 'react';
import { Link, useParams } from 'react-router';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/shared/ui/sidebar';

import { AppSidebarGlobalGroup } from '../AppSidebarGlobalGroup';
import { AppSidebarMenu } from '../AppSidebarMenu';
import { AppSidebarProjectGroup } from '../AppSidebarProjectGroup';

interface RouteParams {
  id: string;
}

/**
 * AppSidebar - Primary application sidebar containing all navigation elements.
 *
 * Renders the app shell sidebar with:
 * - Global navigation links (Projects)
 * - Project-specific navigation when a project is selected (e.g., Keys, Locales, Jobs, etc.)
 * - Application branding and link to the projects overview in the header
 * - Account menu (avatar, profile, logout) in the footer
 * - Responsive support for off-canvas/mobile and desktop layouts
 * - Active route highlighting for all navigational elements
 *
 * @param props - Props forwarded to the Sidebar component
 * @returns The main sidebar layout with navigation and user menu
 */
export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { id: projectId } = useParams<keyof RouteParams>();

  return (
    <Sidebar collapsible="offcanvas" data-testid="app-sidebar" {...props}>
      <SidebarHeader className="border-sidebar-border border-b">
        <Link className="flex items-center gap-2 px-2 py-2" to="/projects">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <span className="text-sm font-bold">i18n</span>
          </div>
          <span className="text-lg font-semibold">i18n-mate</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <AppSidebarGlobalGroup />
        <AppSidebarProjectGroup projectId={projectId} />
      </SidebarContent>
      <SidebarFooter>
        <AppSidebarMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
