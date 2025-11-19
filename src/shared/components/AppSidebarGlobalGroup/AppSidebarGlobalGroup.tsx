import { Link } from 'react-router';

import { useActiveNavigation } from '../../hooks';
import { GLOBAL_NAVIGATION_ITEMS } from '../../lib/navigation';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../ui/sidebar';

/**
 * AppSidebarGlobalGroup - Renders the main global navigation group in the application sidebar.
 *
 * Displays the root-level navigation items (such as Projects) that are always visible,
 * regardless of the current route or selected project context.
 *
 * - Highlights the active navigation item based on the current route.
 * - Uses the shared sidebar UI components for consistency and accessibility.
 * - Intended for use as part of the primary sidebar layout.
 *
 * @returns {JSX.Element} Sidebar group containing global navigation menu items.
 */
export function AppSidebarGlobalGroup() {
  const items = useActiveNavigation(GLOBAL_NAVIGATION_ITEMS);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.label}>
                <Link to={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
