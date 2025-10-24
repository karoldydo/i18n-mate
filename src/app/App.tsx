import { Suspense } from 'react';
import { Outlet } from 'react-router';

import './App.css';

function App() {
  return (
    <>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
        <Outlet />
      </Suspense>
    </>
  );
}

export default App;
