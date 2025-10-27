import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { useProject } from '../../projects/api/useProject';
import { useUpdateTranslation } from '../../translations/api/useUpdateTranslation';
import { useKeysPerLanguageView } from '../api/useKeysPerLanguageView';
import { KeysPerLanguageDataTable } from '../components/KeysPerLanguageDataTable';
import { SearchAndFilterBar } from '../components/SearchAndFilterBar';
import { useKeysPerLanguageState } from '../hooks/useKeysPerLanguageState';

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
  const queryClient = useQueryClient();
  const { locale, projectId } = useParams<keyof RouteParams>();
  const navigate = useNavigate();

  // validate UUID format
  const validation = UUID_SCHEMA.safeParse(projectId);
  const validProjectId = validation.data ?? '';
  const validLocale = locale || '';

  // manage state with custom hook
  const {
    cancelEditing,
    editError,
    editingKeyId,
    isSaving,
    missingOnly,
    page,
    pageSize,
    searchValue,
    setError,
    setMissingOnly,
    setPage,
    setSavingState,
    setSearchValue,
    startEditing,
  } = useKeysPerLanguageState();

  // fetch project to validate locale
  const { data: project, isLoading: isLoadingProject } = useProject(validProjectId);

  // fetch keys data for the selected language
  const {
    data: keysData,
    error,
    isError,
    isLoading,
  } = useKeysPerLanguageView({
    limit: pageSize,
    locale: validLocale,
    missing_only: missingOnly,
    offset: (page - 1) * pageSize,
    project_id: validProjectId,
    search: searchValue || undefined,
  });

  // mutation for updating translation values (dynamic - accepts all params in payload)
  const updateTranslationMutation = useUpdateTranslation();

  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  const handleBackToKeys = useCallback(() => {
    navigate(`/projects/${validProjectId}/keys`);
  }, [navigate, validProjectId]);

  const handleBackToLocales = useCallback(() => {
    navigate(`/projects/${validProjectId}/locales`);
  }, [navigate, validProjectId]);

  const totalPages = useMemo(() => {
    if (!keysData) return 1;
    return Math.ceil(keysData.metadata.total / pageSize);
  }, [keysData, pageSize]);

  const handleSaveEdit = useCallback(
    (keyId: string, newValue: string) => {
      setSavingState(true);

      updateTranslationMutation.mutate(
        {
          is_machine_translated: false,
          key_id: keyId,
          locale: validLocale,
          project_id: validProjectId,
          updated_by_user_id: null,
          updated_source: 'user',
          value: newValue || null,
        },
        {
          onError: ({ error: apiError }) => {
            setSavingState(false);
            setError(apiError.message);
            toast.error(apiError.message);
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keys-per-language-view'] });
            setSavingState(false);
            setError(null);
            toast.success('Translation updated successfully');
          },
        }
      );
    },
    [queryClient, setError, setSavingState, updateTranslationMutation, validLocale, validProjectId]
  );

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

  // loading state
  if (isLoadingProject) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // error state
  if (isError || !keysData) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Keys</h2>
          <p className="text-muted-foreground text-sm">{error?.error?.message || 'Failed to load translation keys.'}</p>
          <Button className="mt-4" onClick={handleBackToKeys} variant="outline">
            Back to Keys
          </Button>
        </div>
      </div>
    );
  }

  if (!locale || !project) {
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
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <Button
            aria-label="Back to keys list"
            className="mb-4"
            onClick={handleBackToLocales}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to locales
          </Button>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Translation Keys - {locale}</h1>
            {project.name && <p className="text-muted-foreground mt-1 text-sm">{project.name}</p>}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <SearchAndFilterBar
          missingOnly={missingOnly}
          onMissingToggle={setMissingOnly}
          onSearchChange={setSearchValue}
          searchValue={searchValue}
        />

        {/* Data Table */}
        <KeysPerLanguageDataTable
          editError={editError ?? undefined}
          editingKeyId={editingKeyId}
          isLoading={isLoading}
          isSaving={isSaving}
          keys={keysData.data}
          onEditEnd={cancelEditing}
          onEditSave={handleSaveEdit}
          onEditStart={startEditing}
          onPageChange={setPage}
          pagination={{
            currentPage: page,
            totalPages,
          }}
        />
      </div>
    </div>
  );
}
