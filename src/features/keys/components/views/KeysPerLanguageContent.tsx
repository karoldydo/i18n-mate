import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import type { PaginationParams } from '@/shared/types';

import { BackButton, CardList, EmptyState, PageHeader } from '@/shared/components';

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
  const { data: keys } = useKeysPerLanguageView({
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

  const hasKeys = useMemo(() => Boolean(keys?.data.length), [keys?.data]);

  const emptyState = useMemo(
    () =>
      missingOnly ? (
        <EmptyState
          description="All translation keys have been translated. Your project is fully localized."
          header="All translations complete"
          icon={<CheckCircle2 />}
        />
      ) : (
        <EmptyState
          description="Create your first translation key to start managing multilingual content for this project."
          header="No translation keys yet"
        />
      ),
    [missingOnly]
  );

  if (!project || !keys) {
    return null;
  }

  return (
    <div className="animate-in fade-in container duration-500">
      <div className="space-y-6">
        <BackButton ariaLabel="Back to keys list" buttonLabel="Back to locales" to={`/projects/${projectId}/locales`} />
        <PageHeader header={`Translations - ${locale.toUpperCase()}`}>
          <p className="text-muted-foreground text-sm sm:text-base">
            Review and manage all translation keys for the <span className="font-medium">{locale}</span> locale. Edit
            values, track missing translations, and ensure consistency across the{' '}
            <span className="font-medium">{project.name}</span> project.
          </p>
        </PageHeader>
        <CardList
          actions={
            <MissingFilterToggle
              enabled={missingOnly}
              label="Show only missing translations"
              onToggle={setMissingOnly}
            />
          }
          emptyState={emptyState}
          pagination={
            hasKeys
              ? {
                  metadata: keys.metadata,
                  onPageChange: handlePageChange,
                  params: paginationParams,
                }
              : undefined
          }
          search={hasKeys && <SearchInput onChange={setSearchValue} placeholder="Search keys..." value={searchValue} />}
        >
          {keys.data.map((key) => (
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
