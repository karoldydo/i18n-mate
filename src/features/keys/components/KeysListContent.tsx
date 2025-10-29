import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import type { KeyDefaultViewResponse } from '@/shared/types';

import { Button } from '@/shared/ui/button';

import { useProject } from '../../projects/api/useProject';
import { useUpdateTranslation } from '../../translations/api/useUpdateTranslation';
import { useKeysDefaultView } from '../api/useKeysDefaultView';
import { useKeysListFilters } from '../hooks/useKeysListFilters';
import { AddKeyDialog } from './AddKeyDialog';
import { DeleteKeyDialog } from './DeleteKeyDialog';
import { KeysDataTable } from './KeysDataTable';
import { PageHeader } from './PageHeader';
import { SearchAndFilterBar } from './SearchAndFilterBar';

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
  const navigate = useNavigate();
  const [editingKeyId, setEditingKeyId] = useState<null | string>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<null | string>(null);
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<KeyDefaultViewResponse | null>(null);

  // manage filter state with URL synchronization
  const { missingOnly, page, pageSize, searchValue, setMissingOnly, setPage, setSearchValue } = useKeysListFilters();

  // fetch project to get default locale
  const { data: project } = useProject(projectId);

  // fetch keys data
  const { data: keysData } = useKeysDefaultView({
    limit: pageSize,
    missing_only: missingOnly,
    offset: (page - 1) * pageSize,
    project_id: projectId,
    search: searchValue || undefined,
  });

  // mutation for updating translation values
  const updateTranslationMutation = useUpdateTranslation();

  const handleBackToProject = useCallback(() => {
    navigate(`/projects/${projectId}`);
  }, [navigate, projectId]);

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

  const handleDeleteKey = useCallback((key: KeyDefaultViewResponse) => {
    setKeyToDelete(key);
    setDeleteKeyDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setKeyToDelete(null);
  }, []);

  const handleAddKeyClick = useCallback(() => {
    setAddKeyDialogOpen(true);
  }, []);

  if (!project || !keysData) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(keysData.metadata.total / pageSize));

  return (
    <>
      <div className="animate-in fade-in container mx-auto py-8 duration-500">
        <div className="space-y-6">
          <div>
            <Button
              aria-label="Back to project details"
              className="mb-4"
              onClick={handleBackToProject}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
          </div>
          <PageHeader onAddKey={handleAddKeyClick} projectName={project.name} />
          <SearchAndFilterBar
            missingOnly={missingOnly}
            onMissingToggle={setMissingOnly}
            onSearchChange={setSearchValue}
            searchValue={searchValue}
          />
          <KeysDataTable
            editError={editError ?? undefined}
            editingKeyId={editingKeyId}
            isLoading={false}
            isSaving={isSaving}
            keys={keysData.data}
            onDeleteKey={handleDeleteKey}
            onEditEnd={handleEditEnd}
            onEditSave={handleSaveEdit}
            onEditStart={setEditingKeyId}
            onPageChange={setPage}
            pagination={{
              currentPage: page,
              totalPages,
            }}
          />
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
