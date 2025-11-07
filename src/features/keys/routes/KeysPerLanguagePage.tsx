import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ErrorBoundary, ValidationError } from '@/shared/components';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { KeysPerLanguageContent } from '../components/views/KeysPerLanguageContent';

interface RouteParams {
  id: string;
  locale: string;
}

/**
 * KeysPerLanguagePage - Main page component for keys list per-language view
 *
 * Displays translation keys for a specific non-default language in a project.
 * Users can view all keys for the selected locale, filter by missing translations,
 * search by key name, and perform inline editing with autosave functionality.
 * Provides clear metadata about translation provenance (manual vs machine-translated)
 * and timestamps.
 */
export function KeysPerLanguagePage() {
  const { id, locale: languageCode } = useParams<keyof RouteParams>();
  const navigate = useNavigate();

  // validate UUID format
  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);
  const locale = useMemo(() => languageCode || '', [languageCode]);

  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  const handleBackToKeys = useCallback(() => {
    navigate(`/projects/${projectId}/keys`);
  }, [navigate, projectId]);

  if (!validation.success) {
    return (
      <ValidationError
        buttonLabel="Back to projects"
        dataTestId="keys-per-language-page"
        onClick={handleBackToProjects}
      />
    );
  }

  if (!locale) {
    return (
      <ValidationError
        buttonLabel="Back to keys"
        dataTestId="keys-per-language-page-locale"
        onClick={handleBackToKeys}
      />
    );
  }

  return (
    <ErrorBoundary resetKeys={[projectId, locale]}>
      <KeysPerLanguageContent locale={locale} projectId={projectId} />
    </ErrorBoundary>
  );
}
