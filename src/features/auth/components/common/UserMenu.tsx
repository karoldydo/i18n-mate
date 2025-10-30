import { LogOut, User } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';

import { useSignOut } from '../../api';

/**
 * UserMenu - Dropdown menu component for authenticated users
 *
 * Displays user email and provides logout functionality.
 * Used in the ProtectedLayout header.
 *
 * After successful logout, redirects to /login page.
 */
export function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const signOut = useSignOut();

  const handleLogout = useCallback(() => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        // automatic redirect to login after successful logout
        navigate('/login', { replace: true });
      },
    });
  }, [navigate, signOut]);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" size="sm" variant="outline">
          <User className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem disabled={signOut.isPending} onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
