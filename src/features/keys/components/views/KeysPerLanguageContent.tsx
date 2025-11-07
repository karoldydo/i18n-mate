import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import type { PaginationParams } from '@/shared/types';

import { BackButton, CardList } from '@/shared/components';

import { useProject } from '../../../projects/api/useProject';
import { useUpdateTranslation } from '../../../translations/api/useUpdateTranslation';
import { useKeysPerLanguageView } from '../../api/useKeysPerLanguageView';
import { useKeysPerLanguageState } from '../../hooks/useKeysPerLanguageState';
import { KeyTranslationCard } from '../cards/KeyTranslationCard';
import { MissingFilterToggle } from '../common/MissingFilterToggle';
import { SearchInput } from '../common/SearchInput';

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

  // convert page-based pagination to offset-based for CardList
  const paginationParams = useMemo<PaginationParams>(
    () => ({
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    [page, pageSize]
  );

  const handlePageChange = useCallback(
    (params: PaginationParams) => {
      const limit = params.limit ?? pageSize;
      const newPage = limit > 0 ? Math.floor((params.offset ?? 0) / limit) + 1 : 1;
      setPage(newPage);
    },
    [pageSize, setPage]
  );

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

  const hasKeys = Boolean(keysData.data.length);
  const emptyState = (
    <div className="border-border rounded-lg border p-12 text-center">
      <p className="text-muted-foreground text-lg">No translation keys found</p>
      <p className="text-muted-foreground mt-2 text-sm">Try adjusting your search or filters</p>
    </div>
  );

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
        <CardList
          emptyState={!hasKeys ? emptyState : undefined}
          filterToggle={
            <MissingFilterToggle
              enabled={missingOnly}
              label="Show only missing translations"
              onToggle={setMissingOnly}
            />
          }
          pagination={
            hasKeys
              ? {
                  metadata: keysData.metadata,
                  onPageChange: handlePageChange,
                  params: paginationParams,
                }
              : undefined
          }
          searchInput={<SearchInput onChange={setSearchValue} placeholder="Search keys..." value={searchValue} />}
        >
          {keysData.data.map((key) => (
            <KeyTranslationCard
              editError={editingKeyId === key.key_id ? (editError ?? undefined) : undefined}
              isEditing={editingKeyId === (key.key_id ?? '')}
              isSaving={editingKeyId === (key.key_id ?? '') && isSaving}
              key={key.key_id ?? undefined}
              keyData={key}
              onEditEnd={cancelEditing}
              onEditStart={() => startEditing(key.key_id ?? '')}
              onValueChange={(newValue) => handleSaveEdit(key.key_id ?? '', newValue)}
            />
          ))}
        </CardList>
      </div>
    </div>
  );
}
