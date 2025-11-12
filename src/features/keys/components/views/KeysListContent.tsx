import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { KeyDefaultViewItem, PaginationParams } from '@/shared/types';

import { BackButton, CardList, PageHeader } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { useProject } from '../../../projects/api/useProject';
import { useUpdateTranslation } from '../../../translations/api/useUpdateTranslation';
import { useKeysDefaultView } from '../../api/useKeysDefaultView';
import { useKeysListFilters } from '../../hooks/useKeysListFilters';
import { KeyCard } from '../cards/KeyCard';
import { MissingFilterToggle } from '../common/MissingFilterToggle';
import { SearchInput } from '../common/SearchInput';
import { AddKeyDialog } from '../dialogs/AddKeyDialog';
import { DeleteKeyDialog } from '../dialogs/DeleteKeyDialog';

interface KeysListContentProps {
  projectId: string;
}

/**
 * KeysListContent - Content component for keys list default view
 *
 * Fetches and displays translation keys with their default language values.
 * Uses useSuspenseQuery for automatic loading state handling via Suspense boundary.
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

  if (!project || !keys) {
    return null;
  }

  // FIXME:
  const hasKeys = Boolean(keys.data.length);
  const emptyState = (
    <div className="border-border rounded-lg border p-12 text-center">
      <p className="text-muted-foreground text-lg">No translation keys found</p>
      <p className="text-muted-foreground mt-2 text-sm">Get started by adding your first translation key</p>
    </div>
  );

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
              <Button data-testid="add-key-button" onClick={handleAddKeyClick}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add key</span>
                <span className="sm:hidden">Add</span>
              </Button>
            }
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
                    metadata: keys.metadata,
                    onPageChange: handlePageChange,
                    params: paginationParams,
                  }
                : undefined
            }
            searchInput={<SearchInput onChange={setSearchValue} placeholder="Search" value={searchValue} />}
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
