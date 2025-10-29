import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { ErrorBoundary, Loading } from '@/shared/components';

import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
