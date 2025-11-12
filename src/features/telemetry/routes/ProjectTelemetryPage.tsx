import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

import { UUID_SCHEMA } from '../api';
import { ProjectTelemetryContent } from '../components/views/ProjectTelemetryContent';

interface RouteParams {
  id: string;
}

/**
 * ProjectTelemetryPage
 *
 * Main route component for displaying telemetry data for a specific project.
 *
 * - Validates the `projectId` route parameter as a UUID via `UUID_SCHEMA`
 *   before rendering project telemetry content.
 * - Renders a `ValidationError` fallback with navigation if the ID is invalid.
 * - Delegates data loading and error handling to the content component,
 *   which leverages TanStack Query for asynchronous state management.
 * - Wraps main content in an `ErrorBoundary`, resetting on `projectId` change
 *   to catch and handle unexpected rendering or data-fetching failures gracefully.
 *
 * @returns {JSX.Element} The telemetry view UI or validation error state.
 */
export function ProjectTelemetryPage() {
  const { id } = useParams<keyof RouteParams>();

  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  if (!validation.success) {
    return <ValidationError buttonLabel="Go back" dataTestId="project-telemetry-page" to="/projects" />;
  }

  return (
    <ErrorBoundary resetKeys={[projectId]}>
      <ProjectTelemetryContent projectId={projectId} />
    </ErrorBoundary>
  );
}
