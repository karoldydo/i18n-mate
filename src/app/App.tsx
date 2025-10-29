import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { Loading } from '@/shared/components';

import './App.css';

function App() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </>
  );
}

export default App;
