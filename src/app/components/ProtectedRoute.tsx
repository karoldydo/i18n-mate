import { type ComponentType } from 'react';

import { AuthGuard } from '@/features/auth';

interface ProtectedRouteProps {
  Component: ComponentType;
}

/**
 * ProtectedRoute - Wrapper for protected route components
 *
 * Ensures user is authenticated and email is verified before rendering component.
 * Loading states for lazy-loaded routes are handled by the Suspense boundary in App.tsx.
 */
export function ProtectedRoute({ Component }: ProtectedRouteProps) {
  return (
    <AuthGuard>
      <Component />
    </AuthGuard>
  );
}
