import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { useProject } from '../../projects/api/useProject';
import { useUpdateTranslation } from '../../translations/api/useUpdateTranslation';
import { useKeysPerLanguageView } from '../api/useKeysPerLanguageView';
import { useKeysPerLanguageState } from '../hooks/useKeysPerLanguageState';
import { KeysPerLanguageDataTable } from './KeysPerLanguageDataTable';
import { SearchAndFilterBar } from './SearchAndFilterBar';

interface KeysPerLanguageContentProps {
  locale: string;
  projectId: string;
}

/**
 * KeysPerLanguageContent - Content component for keys list per-language view
 *
 * Fetches and displays translation keys for a specific non-default language.
 * Uses useSuspenseQuery for automatic loading state handling via Suspense boundary.
 */
export function KeysPerLanguageContent({ locale, projectId }: KeysPerLanguageContentProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
  const { data: project, error: projectError, isError: isProjectError } = useProject(projectId);

  // fetch keys data for the selected language
  const {
    data: keysData,
    error,
    isError,
  } = useKeysPerLanguageView({
    limit: pageSize,
    locale: locale,
    missing_only: missingOnly,
    offset: (page - 1) * pageSize,
    project_id: projectId,
    search: searchValue || undefined,
  });

  // mutation for updating translation values (dynamic - accepts all params in payload)
  const updateTranslationMutation = useUpdateTranslation();

  const handleBackToKeys = useCallback(() => {
    navigate(`/projects/${projectId}/keys`);
  }, [navigate, projectId]);

  const handleBackToLocales = useCallback(() => {
    navigate(`/projects/${projectId}/locales`);
  }, [navigate, projectId]);

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
          locale: locale,
          project_id: projectId,
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
    [queryClient, setError, setSavingState, updateTranslationMutation, locale, projectId]
  );

  // error state
  if (isProjectError || isError || !keysData || !project) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Keys</h2>
          <p className="text-muted-foreground text-sm">
            {projectError?.error?.message || error?.error?.message || 'Failed to load translation keys.'}
          </p>
          <Button className="mt-4" onClick={handleBackToKeys} variant="outline">
            Back to Keys
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in container mx-auto py-8 duration-500">
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
        <SearchAndFilterBar
          missingOnly={missingOnly}
          onMissingToggle={setMissingOnly}
          onSearchChange={setSearchValue}
          searchValue={searchValue}
        />
        <KeysPerLanguageDataTable
          editError={editError ?? undefined}
          editingKeyId={editingKeyId}
          isLoading={false}
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
