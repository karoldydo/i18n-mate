import { useState } from 'react';

import type { ProjectWithCounts } from '@/shared/types';

import { CreateProjectDialog } from '../components/CreateProjectDialog';
import { DeleteProjectDialog } from '../components/DeleteProjectDialog';
import { EditProjectDialog } from '../components/EditProjectDialog';
import { ProjectListTable } from '../components/ProjectListTable';

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
  const [selectedProject, setSelectedProject] = useState<null | ProjectWithCounts>(null);

  const handleEditClick = (project: ProjectWithCounts) => {
    setSelectedProject(project);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (project: ProjectWithCounts) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Projects</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage your translation projects and their locales
          </p>
        </div>
      </div>

      <ProjectListTable
        onCreateClick={() => setIsCreateDialogOpen(true)}
        onDeleteClick={handleDeleteClick}
        onEditClick={handleEditClick}
      />

      <CreateProjectDialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen} />

      {selectedProject && (
        <EditProjectDialog onOpenChange={setIsEditDialogOpen} open={isEditDialogOpen} project={selectedProject} />
      )}

      {selectedProject && (
        <DeleteProjectDialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen} project={selectedProject} />
      )}
    </div>
  );
}
