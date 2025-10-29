import { Suspense, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Loading } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { KeysPerLanguageContent } from '../components/KeysPerLanguageContent';

interface RouteParams {
  locale: string;
  projectId: string;
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
  const { locale, projectId } = useParams<keyof RouteParams>();
  const navigate = useNavigate();

  // validate UUID format
  const validation = useMemo(() => UUID_SCHEMA.safeParse(projectId), [projectId]);
  const validProjectId = useMemo(() => validation.data ?? '', [validation.data]);
  const validLocale = useMemo(() => locale || '', [locale]);

  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  const handleBackToKeys = useCallback(() => {
    navigate(`/projects/${validProjectId}/keys`);
  }, [navigate, validProjectId]);

  // invalid project ID
  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={handleBackToProjects} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // invalid locale
  if (!locale) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Locale</h2>
          <p className="text-muted-foreground text-sm">The locale specified is not valid for this project.</p>
          <Button className="mt-4" onClick={handleBackToKeys} variant="outline">
            Back to Keys
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<Loading />}>
      <KeysPerLanguageContent locale={validLocale} projectId={validProjectId} />
    </Suspense>
  );
}
