import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import type { LocaleItem } from '@/shared/types';

import { BackButton, CardList, PageHeader } from '@/shared/components';
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
 * ProjectLocalesContent – Displays and manages all locales for a given project.
 *
 * Fetches the list of locales for the specified project and renders management actions
 * including adding, editing, and deleting locales. Presents each locale as a card with
 * inline actions and navigates to the translation keys view for the selected locale.
 *
 * This component leverages Suspense boundaries via useSuspenseQuery (from useProjectLocales)
 * for automatic loading state handling.
 *
 * @param {ProjectLocalesContentProps} props - The component props
 * @param {string} props.projectId - ID of the project whose locales are being managed
 *
 * @returns {JSX.Element | null} The rendered locales management UI, or null if data is loading
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

  if (!locales) {
    return null;
  }

  return (
    <>
      <div className="animate-in fade-in container duration-500">
        <div className="space-y-6">
          <BackButton ariaLabel="Back to project details" buttonLabel="Back to project" to={`/projects/${projectId}`} />
          <PageHeader
            header="Languages"
            subHeading="Expand your project to new markets by adding languages. Manage your multilingual content, track translation coverage, and ensure consistent localization across all supported locales."
          />
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
        </div>
      </div>
      <AddLocaleDialog onOpenChange={setAddDialogOpen} open={addDialogOpen} projectId={projectId} />
      <EditLocaleDialog locale={selectedLocale} onOpenChange={setEditDialogOpen} open={editDialogOpen} />
      <DeleteLocaleDialog locale={selectedLocale} onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen} />
    </>
  );
}
