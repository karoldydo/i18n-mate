import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { ProtectedLayout } from '@/features/auth/components/layouts/ProtectedLayout';
import { ErrorBoundary, Loading } from '@/shared/components';

import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <ProtectedLayout>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </ProtectedLayout>
    </ErrorBoundary>
  );
}

export default App;
