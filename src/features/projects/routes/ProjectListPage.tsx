import { useCallback, useState } from 'react';

import type { ProjectWithCounts } from '@/shared/types';

import { ErrorBoundary } from '@/shared/components';

import { CreateProjectDialog } from '../components/dialogs/CreateProjectDialog';
import { DeleteProjectDialog } from '../components/dialogs/DeleteProjectDialog';
import { EditProjectDialog } from '../components/dialogs/EditProjectDialog';
import { ProjectListTable } from '../components/tables/ProjectListTable';

/**
 * ProjectListPage - Main page component for displaying and managing projects
 *
 * Orchestrates the project list view with table display and dialog management.
 * Handles routing and navigation after project creation.
 */
export function ProjectListPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [project, setProject] = useState<null | ProjectWithCounts>(null);

  const handleCreateClick = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((project: ProjectWithCounts) => {
    setProject(project);
    setIsEditDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((project: ProjectWithCounts) => {
    setProject(project);
    setIsDeleteDialogOpen(true);
  }, []);

  return (
    <div className="animate-in fade-in container h-full duration-500" data-testid="project-list-page">
      <div className="mb-6 flex items-center justify-between sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Projects</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage your translation projects and their locales
          </p>
        </div>
      </div>

      <ErrorBoundary>
        <ProjectListTable
          onCreateClick={handleCreateClick}
          onDeleteClick={handleDeleteClick}
          onEditClick={handleEditClick}
        />
      </ErrorBoundary>

      <CreateProjectDialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen} />

      {project && <EditProjectDialog onOpenChange={setIsEditDialogOpen} open={isEditDialogOpen} project={project} />}

      {project && (
        <DeleteProjectDialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen} project={project} />
      )}
    </div>
  );
}
