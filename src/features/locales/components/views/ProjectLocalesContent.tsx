import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import type { LocaleItem } from '@/shared/types';

import { BackButton, CardList } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { useProjectLocales } from '../../api/useProjectLocales';
import { LocaleCard } from '../cards/LocaleCard';
import { AddLocaleDialog } from '../dialogs/AddLocaleDialog';
import { DeleteLocaleDialog } from '../dialogs/DeleteLocaleDialog';
import { EditLocaleDialog } from '../dialogs/EditLocaleDialog';

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
  const [selectedLocale, setSelectedLocale] = useState<LocaleItem | null>(null);

  const { data: locales } = useProjectLocales(projectId);

  const handleEdit = useCallback((locale: LocaleItem) => {
    setSelectedLocale(locale);
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((locale: LocaleItem) => {
    setSelectedLocale(locale);
    setDeleteDialogOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (locale: LocaleItem) => {
      navigate(`/projects/${projectId}/keys/${locale.locale}`);
    },
    [navigate, projectId]
  );

  const handleAddDialogOpen = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  const hasLocales = useMemo(() => Boolean(locales && locales.length > 0), [locales]);

  if (!locales) {
    return null;
  }

  return (
    <>
      <div className="animate-in fade-in container duration-500">
        <div className="space-y-6">
          <BackButton ariaLabel="Back to project details" buttonLabel="Back to project" to={`/projects/${projectId}`} />
          <header>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Languages</h1>
              <p className="text-muted-foreground mt-1" id="page-description">
                Expand your project to new markets by adding languages. Manage your multilingual content, track
                translation coverage, and ensure consistent localization across all supported locales.
              </p>
            </div>
          </header>
          <main aria-describedby="page-description" role="main">
            {hasLocales ? (
              <CardList
                actions={
                  <Button aria-label="Add new language" data-testid="add-language-button" onClick={handleAddDialogOpen}>
                    <Plus />
                    <span className="hidden sm:inline">Add language</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                }
                data-testid="locales-list"
              >
                {locales.map((locale) => (
                  <LocaleCard
                    key={locale.id}
                    locale={locale}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onNavigate={handleRowClick}
                  />
                ))}
              </CardList>
            ) : (
              <div
                className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
                data-testid="locales-list-empty"
              >
                <p className="text-muted-foreground mb-4">
                  No languages found. Add your first language to get started.
                </p>
                <Button data-testid="add-language-button-empty" onClick={handleAddDialogOpen}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Language
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      <AddLocaleDialog onOpenChange={setAddDialogOpen} open={addDialogOpen} projectId={projectId} />
      <EditLocaleDialog locale={selectedLocale} onOpenChange={setEditDialogOpen} open={editDialogOpen} />
      <DeleteLocaleDialog locale={selectedLocale} onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen} />
    </>
  );
}
