import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';

import type { KeyDefaultViewResponse } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { useProject } from '../../projects/api/useProject';
import { useUpdateTranslation } from '../../translations/api/useUpdateTranslation';
import { useKeysDefaultView } from '../api/useKeysDefaultView';
import { AddKeyDialog } from '../components/AddKeyDialog';
import { DeleteKeyDialog } from '../components/DeleteKeyDialog';
import { KeysDataTable } from '../components/KeysDataTable';
import { PageHeader } from '../components/PageHeader';
import { SearchAndFilterBar } from '../components/SearchAndFilterBar';
import { useKeysListFilters } from '../hooks/useKeysListFilters';

interface RouteParams {
  projectId: string;
}

/**
 * KeysListPage - Main page component for keys list default view
 *
 * Displays translation keys for a project showing values in the default language
 * along with missing translation counts for other languages. Provides search,
 * filtering, pagination, inline editing, and key management operations.
 */
export function KeysListPage() {
  const queryClient = useQueryClient();
  const { projectId } = useParams<keyof RouteParams>();
  const navigate = useNavigate();
  const [editingKeyId, setEditingKeyId] = useState<null | string>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<null | string>(null);
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<KeyDefaultViewResponse | null>(null);

  // validate UUID format
  const validation = UUID_SCHEMA.safeParse(projectId);
  const validProjectId = validation.data ?? '';

  // manage filter state with URL synchronization
  const { missingOnly, page, pageSize, searchValue, setMissingOnly, setPage, setSearchValue } = useKeysListFilters();

  // fetch project to get default locale
  const { data: project } = useProject(validProjectId);

  // fetch keys data
  const {
    data: keysData,
    error,
    isError,
    isLoading,
  } = useKeysDefaultView({
    limit: pageSize,
    missing_only: missingOnly,
    offset: (page - 1) * pageSize,
    project_id: validProjectId,
    search: searchValue || undefined,
  });

  // mutation for updating translation values
  const updateTranslationMutation = useUpdateTranslation();

  // invalid project ID
  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={() => navigate('/projects')} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // loading state
  if (isLoading) {
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
          <Button className="mt-4" onClick={() => navigate(`/projects/${validProjectId}`)} variant="outline">
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(keysData.metadata.total / pageSize);

  // handle save edit with autosave
  const handleSaveEdit = (keyId: string, newValue: string) => {
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
        project_id: validProjectId,
        updated_by_user_id: null, // will be set by the backend
        updated_source: 'user',
        value: newValue || null, // empty string becomes NULL
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
  };

  // handle edit end (exit edit mode)
  const handleEditEnd = () => {
    setEditingKeyId(null);
    setEditError(null);
    setIsSaving(false);
  };

  // handle delete key
  const handleDeleteKey = (key: KeyDefaultViewResponse) => {
    setKeyToDelete(key);
    setDeleteKeyDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    setKeyToDelete(null);
  };

  return (
    <>
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div>
            <Button
              aria-label="Back to project details"
              className="mb-4"
              onClick={() => navigate(`/projects/${validProjectId}`)}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
          </div>
          <PageHeader onAddKey={() => setAddKeyDialogOpen(true)} projectName={project?.name} />
          <SearchAndFilterBar
            missingOnly={missingOnly}
            onMissingToggle={setMissingOnly}
            onSearchChange={setSearchValue}
            searchValue={searchValue}
          />
          <KeysDataTable
            editError={editError ?? undefined}
            editingKeyId={editingKeyId}
            isLoading={isLoading}
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
        projectId={validProjectId}
        projectPrefix={project?.prefix || ''}
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
