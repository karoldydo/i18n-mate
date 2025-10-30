import { type ComponentType, Suspense } from 'react';

import { AuthGuard } from '@/features/auth';
import { Loading } from '@/shared/components';

interface ProtectedRouteProps {
  Component: ComponentType;
}

/**
 * ProtectedRoute - Wrapper for protected route components
 *
 * Combines AuthGuard with Suspense for lazy-loaded protected routes.
 * Ensures user is authenticated and email is verified before rendering component.
 */
export function ProtectedRoute({ Component }: ProtectedRouteProps) {
  return (
    <AuthGuard>
      <Suspense fallback={<Loading />}>
        <Component />
      </Suspense>
    </AuthGuard>
  );
}
