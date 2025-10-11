import { createBrowserRouter } from 'react-router';

import App from './App.tsx';

const router = createBrowserRouter([
  {
    Component: App,
    path: '/',
  },
]);

export default router;
