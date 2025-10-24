import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';

import App from './App.tsx';

// lazy-loaded routes
const ProjectListPage = lazy(() =>
  import('../features/projects/routes/ProjectListPage').then((module) => ({
    default: module.ProjectListPage,
  }))
);

const ProjectDetailsPage = lazy(() =>
  import('../features/projects/routes/ProjectDetailsPage').then((module) => ({
    default: module.ProjectDetailsPage,
  }))
);

const ProjectLocalesPage = lazy(() =>
  import('../features/locales/routes/ProjectLocalesPage').then((module) => ({
    default: module.ProjectLocalesPage,
  }))
);

const router = createBrowserRouter([
  {
    Component: App,
    path: '/',
  },
  {
    Component: ProjectListPage,
    path: '/projects',
  },
  {
    Component: ProjectDetailsPage,
    path: '/projects/:id',
  },
  {
    Component: ProjectLocalesPage,
    path: '/projects/:projectId/locales',
  },
]);

export default router;
