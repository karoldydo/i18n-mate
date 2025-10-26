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

const ProjectTelemetryPage = lazy(() =>
  import('../features/telemetry/routes/ProjectTelemetryPage').then((module) => ({
    default: module.ProjectTelemetryPage,
  }))
);

const ExportPage = lazy(() =>
  import('../features/export/routes').then((module) => ({
    default: module.ExportPage,
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
  {
    Component: ProjectTelemetryPage,
    path: '/projects/:id/telemetry',
  },
  {
    Component: ExportPage,
    path: '/projects/:projectId/export',
  },
]);

export default router;
