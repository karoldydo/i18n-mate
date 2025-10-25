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

const KeysListPage = lazy(() =>
  import('../features/keys/routes/KeysListPage').then((module) => ({
    default: module.KeysListPage,
  }))
);

const KeysPerLanguagePage = lazy(() =>
  import('../features/keys/routes/KeysPerLanguagePage').then((module) => ({
    default: module.KeysPerLanguagePage,
  }))
);

const TranslationJobsPage = lazy(() =>
  import('../features/translation-jobs/routes/TranslationJobsPage').then((module) => ({
    default: module.TranslationJobsPage,
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
  {
    Component: KeysListPage,
    path: '/projects/:projectId/keys',
  },
  {
    Component: KeysPerLanguagePage,
    path: '/projects/:projectId/keys/:locale',
  },
  {
    Component: TranslationJobsPage,
    path: '/projects/:id/translation-jobs',
  },
]);

export default router;
