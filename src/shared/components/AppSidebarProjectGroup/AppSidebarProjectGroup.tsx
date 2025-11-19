import { isEmpty } from 'lodash-es';
import { Link } from 'react-router';

import { useActiveNavigation } from '../../hooks/useActiveNavigation';
import { getProjectNavigationItems } from '../../lib/navigation';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '../../ui/sidebar';

interface AppSidebarProjectGroupProps {
  projectId?: string;
}

/**
 * AppSidebarProjectGroup - Renders the sidebar navigation group for a specific project.
 *
 * - Displays project-scoped navigation links (Keys, Locales, Jobs, etc.) if a valid project is selected.
 * - Project navigation is only rendered if there are items (i.e., a project ID is present and valid).
 * - Each navigation item highlights as active based on the current route.
 * - Used within the main AppSidebar component to provide context-sensitive navigation.
 *
 * @param {AppSidebarProjectGroupProps} props - Component props
 * @param {string} [props.projectId] - Optional project ID used to generate project-specific navigation items
 *
 * @returns {JSX.Element | null} Sidebar group with project navigation links or null if no items
 */
export function AppSidebarProjectGroup({ projectId }: AppSidebarProjectGroupProps) {
  const items = useActiveNavigation(getProjectNavigationItems(projectId));

  return (
    !isEmpty(items) && (
      <>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Project</SidebarGroupLabel>
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
      </>
    )
  );
}
