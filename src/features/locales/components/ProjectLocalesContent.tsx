import { ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import type { ProjectLocaleWithDefault } from '@/shared/types';

import { Button } from '@/shared/ui/button';

import { useProjectLocales } from '../api/useProjectLocales';
import { AddLocaleDialog } from './AddLocaleDialog';
import { DeleteLocaleDialog } from './DeleteLocaleDialog';
import { EditLocaleDialog } from './EditLocaleDialog';
import { LocalesDataTable } from './LocalesDataTable';

interface ProjectLocalesContentProps {
  projectId: string;
}

/**
 * ProjectLocalesContent - Content component for project locales view
 *
 * Fetches and displays project locales with management actions.
 * Uses useSuspenseQuery for automatic loading state handling via Suspense boundary.
 */
export function ProjectLocalesContent({ projectId }: ProjectLocalesContentProps) {
  const navigate = useNavigate();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<null | ProjectLocaleWithDefault>(null);

  const { data: locales, error, isError } = useProjectLocales(projectId);

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
      navigate(`/projects/${projectId}/keys/${locale.locale}`);
    },
    [navigate, projectId]
  );

  const handleBackClick = useCallback(() => {
    navigate(`/projects/${projectId}`);
  }, [navigate, projectId]);

  const handleAddDialogOpen = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  // error state
  if (isError || !locales) {
    return (
      <div aria-live="assertive" className="container mx-auto py-8" role="alert">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Languages</h2>
          <p className="text-muted-foreground text-sm">
            {error?.error?.message || 'Failed to load project languages.'}
          </p>
          <Button className="mt-4" onClick={handleBackClick} variant="outline">
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="animate-in fade-in container mx-auto py-8 duration-500">
        <div className="space-y-6">
          <Button aria-label="Back to project details" onClick={handleBackClick} size="sm" variant="ghost">
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
            Back to Project
          </Button>

          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Languages</h1>
              <p className="text-muted-foreground mt-1" id="page-description">
                Manage languages for this project
              </p>
            </div>
            <Button aria-label="Add new language" onClick={handleAddDialogOpen}>
              Add Language
            </Button>
          </header>

          <main aria-describedby="page-description" role="main">
            <LocalesDataTable
              locales={locales}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onRowClick={handleRowClick}
            />
          </main>
        </div>
      </div>

      <AddLocaleDialog onOpenChange={setAddDialogOpen} open={addDialogOpen} projectId={projectId} />
      <EditLocaleDialog locale={selectedLocale} onOpenChange={setEditDialogOpen} open={editDialogOpen} />
      <DeleteLocaleDialog locale={selectedLocale} onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen} />
    </>
  );
}
