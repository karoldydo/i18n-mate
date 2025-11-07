import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { BackButton } from '@/shared/components';

import { useProject } from '../../../projects/api/useProject';
import { useUpdateTranslation } from '../../../translations/api/useUpdateTranslation';
import { useKeysPerLanguageView } from '../../api/useKeysPerLanguageView';
import { useKeysPerLanguageState } from '../../hooks/useKeysPerLanguageState';
import { SearchAndFilterBar } from '../layouts/SearchAndFilterBar';
import { KeysPerLanguageDataTable } from '../tables/KeysPerLanguageDataTable';

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
  const { data: project } = useProject(projectId);

  // fetch keys data for the selected language
  const { data: keysData } = useKeysPerLanguageView({
    limit: pageSize,
    locale: locale,
    missing_only: missingOnly,
    offset: (page - 1) * pageSize,
    project_id: projectId,
    search: searchValue || undefined,
  });

  // mutation for updating translation values (dynamic - accepts all params in payload)
  const updateTranslationMutation = useUpdateTranslation();

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

  if (!project || !keysData) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(keysData.metadata.total / pageSize));

  return (
    <div className="animate-in fade-in container duration-500">
      <div className="space-y-6">
        <div>
          <BackButton
            ariaLabel="Back to keys list"
            buttonLabel="Back to locales"
            to={`/projects/${projectId}/locales`}
          />
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
