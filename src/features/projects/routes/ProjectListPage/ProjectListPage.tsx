import { useCallback, useState } from 'react';

import type { ProjectResponse } from '@/shared/types';

import { ErrorBoundary, PageHeader } from '@/shared/components';

import { CreateProjectDialog } from '../../components/dialogs/CreateProjectDialog/CreateProjectDialog';
import { DeleteProjectDialog } from '../../components/dialogs/DeleteProjectDialog/DeleteProjectDialog';
import { EditProjectDialog } from '../../components/dialogs/EditProjectDialog/EditProjectDialog';
import { ProjectList } from '../../components/lists/ProjectList/ProjectList';

/**
 * ProjectListPage – Main page for displaying and managing all translation projects.
 *
 * Renders a list of all projects with options to:
 *   - Create a new project (opens CreateProjectDialog)
 *   - Edit an existing project (opens EditProjectDialog with selected project)
 *   - Delete a project (opens DeleteProjectDialog with selected project)
 *
 * Features:
 * - Uses an ErrorBoundary to catch and display errors from the project list.
 * - Utilizes card-based layout for projects with inline actions (edit/delete).
 * - Dialogs are controlled through local state; the currently selected project is tracked for edit/delete actions.
 * - After a project is created, edited, or deleted, the dialogs close and list updates (per underlying query behaviors).
 *
 * @returns {JSX.Element} The project list overview page with dialogs for CRUD operations
 */
export function ProjectListPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [project, setProject] = useState<null | ProjectResponse>(null);

  const handleCreateClick = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((project: ProjectResponse) => {
    setProject(project);
    setIsEditDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((project: ProjectResponse) => {
    setProject(project);
    setIsDeleteDialogOpen(true);
  }, []);

  return (
    <div className="animate-in fade-in container h-full duration-500" data-testid="project-list-page">
      <div className="space-y-6">
        <PageHeader header="Projects">
          <p className="text-muted-foreground text-sm sm:text-base">
            Organize and oversee all your translation projects in one place!
          </p>
          <p className="text-muted-foreground text-sm sm:text-base">
            Start new projects, update project information, or remove projects you no longer need. Get a clear overview
            of your translation work with easy access to project details and progress tracking.
          </p>
        </PageHeader>
        <ErrorBoundary>
          <ProjectList
            onCreateClick={handleCreateClick}
            onDeleteClick={handleDeleteClick}
            onEditClick={handleEditClick}
          />
        </ErrorBoundary>
      </div>
      <CreateProjectDialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen} />
      {project && <EditProjectDialog onOpenChange={setIsEditDialogOpen} open={isEditDialogOpen} project={project} />}
      {project && (
        <DeleteProjectDialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen} project={project} />
      )}
    </div>
  );
}
