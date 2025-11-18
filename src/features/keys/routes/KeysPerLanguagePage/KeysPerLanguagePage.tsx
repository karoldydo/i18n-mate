import { useMemo } from 'react';
import { useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

import { UUID_SCHEMA } from '../../../projects/api/projects.schemas';
import { KeysPerLanguageContent } from '../../components/views/KeysPerLanguageContent';

interface RouteParams {
  id: string;
  locale: string;
}

/**
 * Main page component for keys list per-language view
 *
 * Displays translation keys for a specific non-default language in a project.
 * Users can view all keys for the selected locale, filter by missing translations,
 * search by key name, and perform inline editing with autosave functionality.
 * Provides clear metadata about translation provenance (manual vs machine-translated)
 * and timestamps.
 *
 * Validates the project ID and locale from route parameters and renders validation
 * errors if either is missing or invalid. Wraps the content in an ErrorBoundary
 * for error handling.
 *
 * @returns {JSX.Element} Page component with per-language keys content or validation error
 */
export function KeysPerLanguagePage() {
  const { id, locale: languageCode } = useParams<keyof RouteParams>();

  // validate UUID format
  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);
  const locale = useMemo(() => languageCode || '', [languageCode]);

  if (!validation.success) {
    return <ValidationError buttonLabel="Back to projects" dataTestId="keys-per-language-page" to="/projects" />;
  }

  if (!locale) {
    return (
      <ValidationError
        buttonLabel="Back to keys"
        dataTestId="keys-per-language-page-locale"
        to={`/projects/${projectId}/keys`}
      />
    );
  }

  return (
    <ErrorBoundary resetKeys={[projectId, locale]}>
      <KeysPerLanguageContent locale={locale} projectId={projectId} />
    </ErrorBoundary>
  );
}
