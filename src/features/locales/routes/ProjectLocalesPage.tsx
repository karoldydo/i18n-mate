import { ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import type { ProjectLocaleWithDefault } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

import { UUID_SCHEMA } from '../../projects/api/projects.schemas';
import { useProjectLocales } from '../api/useProjectLocales';
import { AddLocaleDialog } from '../components/AddLocaleDialog';
import { DeleteLocaleDialog } from '../components/DeleteLocaleDialog';
import { EditLocaleDialog } from '../components/EditLocaleDialog';
import { LocalesDataTable } from '../components/LocalesDataTable';

interface RouteParams {
  projectId: string;
}

/**
 * ProjectLocalesPage - Main route component for project languages list view
 *
 * Provides comprehensive interface for managing languages assigned to a specific project.
 * Allows users to view all project locales, add new languages with BCP-47 validation,
 * update language labels, and delete languages (except the default).
 *
 * Route: /projects/:projectId/locales
 */
export function ProjectLocalesPage() {
  const { projectId } = useParams<keyof RouteParams>();
  const navigate = useNavigate();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<null | ProjectLocaleWithDefault>(null);

  // validate UUID format
  const validation = UUID_SCHEMA.safeParse(projectId);
  const validProjectId = validation.data ?? '';

  const handleEdit = useCallback((locale: ProjectLocaleWithDefault) => {
    setSelectedLocale(locale);
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((locale: ProjectLocaleWithDefault) => {
    setSelectedLocale(locale);
    setDeleteDialogOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (locale: ProjectLocaleWithDefault) => {
      navigate(`/projects/${validProjectId}/keys/${locale.locale}`);
    },
    [navigate, validProjectId]
  );

  const { data: locales, error, isError, isLoading, refetch } = useProjectLocales(validProjectId);

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
      <div aria-busy="true" aria-live="polite" className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
        <span className="sr-only">Loading languages...</span>
      </div>
    );
  }

  // error state
  if (isError || !locales) {
    return (
      <div aria-live="assertive" className="container mx-auto py-8" role="alert">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Languages</h2>
          <p className="text-muted-foreground text-sm">
            {error?.error?.message || 'Failed to load project languages.'}
          </p>
          <Button className="mt-4" onClick={() => navigate(`/projects/${validProjectId}`)} variant="outline">
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        {/* Back Navigation */}
        <Button
          aria-label="Back to project details"
          onClick={() => navigate(`/projects/${validProjectId}`)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
          Back to Project
        </Button>

        {/* Page Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Languages</h1>
            <p className="text-muted-foreground mt-1" id="page-description">
              Manage languages for this project
            </p>
          </div>
          <Button aria-label="Add new language" onClick={() => setAddDialogOpen(true)}>
            Add Language
          </Button>
        </header>

        {/* Locales Table */}
        <main aria-describedby="page-description" role="main">
          <LocalesDataTable locales={locales} onDelete={handleDelete} onEdit={handleEdit} onRowClick={handleRowClick} />
        </main>
      </div>

      {/* Dialogs */}
      <AddLocaleDialog
        onOpenChange={setAddDialogOpen}
        onSuccess={() => refetch()}
        open={addDialogOpen}
        projectId={validProjectId}
      />
      <EditLocaleDialog
        locale={selectedLocale}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => refetch()}
        open={editDialogOpen}
      />
      <DeleteLocaleDialog
        locale={selectedLocale}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={() => refetch()}
        open={deleteDialogOpen}
      />
    </div>
  );
}
