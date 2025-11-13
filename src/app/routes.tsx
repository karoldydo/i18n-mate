import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';

import { RegistrationGuard } from '@/features/auth/components/guards/RegistrationGuard';
import { VerificationGuard } from '@/features/auth/components/guards/VerificationGuard';

import App from './App.tsx';
import { ProtectedRoute } from './components/ProtectedRoute';

// auth routes (public)
const LoginPage = lazy(() =>
  import('../features/auth/routes/LoginPage').then((module) => ({
    default: module.LoginPage,
  }))
);

const RegisterPage = lazy(() =>
  import('../features/auth/routes/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  }))
);

const ForgotPasswordPage = lazy(() =>
  import('../features/auth/routes/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  }))
);

const ResetPasswordPage = lazy(() =>
  import('../features/auth/routes/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  }))
);

const VerifyEmailPage = lazy(() =>
  import('../features/auth/routes/VerifyEmailPage').then((module) => ({
    default: module.VerifyEmailPage,
  }))
);

const EmailVerifiedPage = lazy(() =>
  import('../features/auth/routes/EmailVerifiedPage').then((module) => ({
    default: module.EmailVerifiedPage,
  }))
);

// feature routes (protected)
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
  // public auth routes
  {
    Component: LoginPage,
    path: '/login',
  },
  {
    element: (
      <RegistrationGuard>
        <RegisterPage />
      </RegistrationGuard>
    ),
    path: '/register',
  },
  {
    Component: ForgotPasswordPage,
    path: '/forgot-password',
  },
  {
    Component: ResetPasswordPage,
    path: '/reset-password',
  },
  {
    element: (
      <VerificationGuard>
        <VerifyEmailPage />
      </VerificationGuard>
    ),
    path: '/verify-email',
  },
  {
    Component: EmailVerifiedPage,
    path: '/email-verified',
  },
  // protected routes - all nested under App layout with ProtectedRoute
  {
    children: [
      {
        Component: ProjectListPage,
        index: true,
        path: '',
      },
      {
        Component: ProjectListPage,
        path: 'projects',
      },
      {
        Component: ProjectDetailsPage,
        path: 'projects/:id',
      },
      {
        Component: ProjectLocalesPage,
        path: 'projects/:id/locales',
      },
      {
        Component: KeysListPage,
        path: 'projects/:id/keys',
      },
      {
        Component: KeysPerLanguagePage,
        path: 'projects/:id/keys/:locale',
      },
      {
        Component: TranslationJobsPage,
        path: 'projects/:id/translation-jobs',
      },
      {
        Component: ProjectTelemetryPage,
        path: 'projects/:id/telemetry',
      },
      {
        Component: ExportPage,
        path: 'projects/:id/export',
      },
    ],
    element: <ProtectedRoute Component={App} />,
    path: '/',
  },
]);

export default router;
