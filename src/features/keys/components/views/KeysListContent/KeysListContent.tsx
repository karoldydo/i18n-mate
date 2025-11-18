import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { KeyDefaultViewItem, PaginationParams } from '@/shared/types';

import { useKeysDefaultView } from '@/features/keys/api/useKeysDefaultView';
import { KeyCard } from '@/features/keys/components/cards/KeyCard';
import { MissingFilterToggle } from '@/features/keys/components/common/MissingFilterToggle';
import { SearchInput } from '@/features/keys/components/common/SearchInput';
import { AddKeyDialog } from '@/features/keys/components/dialogs/AddKeyDialog';
import { DeleteKeyDialog } from '@/features/keys/components/dialogs/DeleteKeyDialog';
import { useKeysListFilters } from '@/features/keys/hooks/useKeysListFilters';
import { useProject } from '@/features/projects/api/useProject';
import { useUpdateTranslation } from '@/features/translations/api/useUpdateTranslation';
import { BackButton, CardList, EmptyState, PageHeader } from '@/shared/components';
import { Button } from '@/shared/ui/button';

interface KeysListContentProps {
  projectId: string;
}

/**
 * Displays the main content of the translation keys list view for a project
 *
 * Features:
 * - Fetches and displays translation keys and their default language values for a specific project.
 * - Provides add, edit, delete, and filtered (missing only, search) key management UX.
 * - Supports paginated display, search, and missing translation filtering of keys.
 * - Allows in-place editing of translation values, including error/saving state.
 * - Handles add and delete dialog state, with real-time list updates on mutation.
 * - Integrates with project context for default locale and prefix logic.
 *
 * State/Behavior:
 * - Synchronizes filters and pagination with the URL.
 * - Shows empty state if no translation keys are present.
 * - Displays action buttons for adding keys and toggling missing translation filter.
 *
 * @param {Object} props - Component props
 * @param {string} props.projectId - The ID of the project whose translation keys to display
 *
 * @returns {JSX.Element | null} The content for the translation keys list, including add/edit/delete controls, pagination, and appropriate empty state; or null while essential data loads
 */
export function KeysListContent({ projectId }: KeysListContentProps) {
  const queryClient = useQueryClient();
  const [editingKeyId, setEditingKeyId] = useState<null | string>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<null | string>(null);
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<KeyDefaultViewItem | null>(null);

  // manage filter state with URL synchronization
  const { missingOnly, page, pageSize, searchValue, setMissingOnly, setPage, setSearchValue } = useKeysListFilters();

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

  // fetch project to get default locale
  const { data: project } = useProject(projectId);

  // fetch keys data
  const { data: keys } = useKeysDefaultView({
    limit: pageSize,
    missing_only: missingOnly,
    offset: (page - 1) * pageSize,
    project_id: projectId,
    search: searchValue || undefined,
  });

  // mutation for updating translation values
  const updateTranslationMutation = useUpdateTranslation();

  const handleSaveEdit = useCallback(
    (keyId: string, newValue: string) => {
      if (!project?.default_locale) {
        toast.error('Failed to update translation: project default locale not found');
        return;
      }

      setIsSaving(true);

      updateTranslationMutation.mutate(
        {
          is_machine_translated: false,
          key_id: keyId,
          locale: project.default_locale,
          project_id: projectId,
          updated_by_user_id: null,
          updated_source: 'user',
          value: newValue || null,
        },
        {
          onError: ({ error: apiError }) => {
            setIsSaving(false);
            setEditError(apiError.message);
            toast.error(apiError.message);
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keys-default-view'] });
            setIsSaving(false);
            setEditError(null);
            toast.success('Translation updated successfully');
          },
        }
      );
    },
    [project?.default_locale, queryClient, updateTranslationMutation, projectId]
  );

  const handleEditEnd = useCallback(() => {
    setEditingKeyId(null);
    setEditError(null);
    setIsSaving(false);
  }, []);

  const handleDeleteKey = useCallback((key: KeyDefaultViewItem) => {
    setKeyToDelete(key);
    setDeleteKeyDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setKeyToDelete(null);
  }, []);

  const handleAddKeyClick = useCallback(() => {
    setAddKeyDialogOpen(true);
  }, []);

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
    <>
      <div className="animate-in fade-in container duration-500">
        <div className="space-y-6">
          <BackButton ariaLabel="Back to project details" buttonLabel="Back to project" to={`/projects/${projectId}`} />
          <PageHeader header="Translation keys">
            <p className="text-muted-foreground text-sm sm:text-base">
              Create and manage translation keys for the <span className="font-medium">{project.name}</span> project.
              Organize your localization workflow, track translation status, and maintain consistency across all
              languages.
            </p>
          </PageHeader>
          <CardList
            actions={
              <div className="flex flex-shrink-0 grow items-center justify-between sm:justify-start sm:gap-4">
                <MissingFilterToggle
                  enabled={missingOnly}
                  label="Show only missing translations"
                  onToggle={setMissingOnly}
                />
                <Button data-testid="add-key-button" onClick={handleAddKeyClick}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add key</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
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
            search={hasKeys && <SearchInput onChange={setSearchValue} placeholder="Search" value={searchValue} />}
          >
            {keys.data.map((key) => (
              <KeyCard
                editError={editingKeyId === key.id ? (editError ?? undefined) : undefined}
                isEditing={editingKeyId === key.id}
                isSaving={editingKeyId === key.id && isSaving}
                key={key.id}
                keyData={key}
                onDelete={() => handleDeleteKey(key)}
                onEditEnd={handleEditEnd}
                onEditStart={() => setEditingKeyId(key.id)}
                onValueChange={(newValue) => handleSaveEdit(key.id, newValue)}
              />
            ))}
          </CardList>
        </div>
      </div>
      <AddKeyDialog
        onOpenChange={setAddKeyDialogOpen}
        open={addKeyDialogOpen}
        projectId={projectId}
        projectPrefix={project.prefix || ''}
      />
      <DeleteKeyDialog
        keyData={keyToDelete}
        onConfirm={handleDeleteConfirm}
        onOpenChange={setDeleteKeyDialogOpen}
        open={deleteKeyDialogOpen}
      />
    </>
  );
}
