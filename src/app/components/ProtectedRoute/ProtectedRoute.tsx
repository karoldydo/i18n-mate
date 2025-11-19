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
 *
 * @param {ProtectedRouteProps} props - Component props
 * @param {ComponentType} props.Component - The React component to render when authenticated
 *
 * @returns {JSX.Element} The rendered component wrapped in AuthGuard
 */
export function ProtectedRoute({ Component }: ProtectedRouteProps) {
  return (
    <AuthGuard>
      <Component />
    </AuthGuard>
  );
}
