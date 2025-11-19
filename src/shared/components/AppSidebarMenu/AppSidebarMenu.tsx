import { EllipsisVerticalIcon, LogOut, User2, UserCircle } from 'lucide-react';
import { useCallback } from 'react';

import { useAuth } from '@/app/providers/AuthProvider';

import { Avatar, AvatarFallback } from '../../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '../../ui/sidebar';

/**
 * AppSidebarMenu - Renders the account/user menu in the application sidebar.
 *
 * Displays the authenticated user's email and provides account-related actions such as log out.
 * The menu is accessible through an avatar button, and includes a placeholder for profile actions.
 * Only renders when a user is authenticated.
 *
 * Features:
 * - Shows user avatar with fallback icon
 * - Displays the user's email
 * - Dropdown menu with disabled "Profile" action and active "Log out"
 * - Log out triggers signOut from authentication context
 * - Responsive menu side based on mobile/desktop sidebar state
 *
 * @returns {JSX.Element|null} Sidebar menu with user actions or null if not authenticated
 */
export function AppSidebarMenu() {
  const { signOut, user } = useAuth();

  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const { isMobile } = useSidebar();

  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              data-testid="sidebar-user-menu-trigger"
              size="lg"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarFallback className="rounded-lg">
                  <User2 className="size-5" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Account</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            data-testid="sidebar-user-menu-content"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    <User2 className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Account</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <UserCircle className="mr-2 size-4" />
                Profile
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="sidebar-user-menu-logout" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
