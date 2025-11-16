import { useCallback, useState } from 'react';

import { useProject } from '../../../api/useProject';
import { DeleteProjectDialog } from '../../dialogs/DeleteProjectDialog/DeleteProjectDialog';
import { EditProjectDialog } from '../../dialogs/EditProjectDialog/EditProjectDialog';
import { ProjectDetailsLayout } from '../../layouts/ProjectDetailsLayout/ProjectDetailsLayout';

interface ProjectDetailsContentProps {
  projectId: string;
}

/**
 * ProjectDetailsContent – Handles fetching and displaying project details,
 * and manages UI state for editing and deleting a project.
 *
 * Fetches project information using `useProject`. Displays the main project
 * details layout, and manages the open states for both the edit and delete
 * project dialogs.
 *
 * Integrates seamlessly with Suspense boundaries by relying on
 * TanStack Query's suspense-based data fetching.
 *
 * @param {Object} props - Component properties
 * @param {string} props.projectId - The unique identifier for the project to display
 *
 * @returns {JSX.Element | null} The rendered project details view, or null if not found
 */
export function ProjectDetailsContent({ projectId }: ProjectDetailsContentProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: project } = useProject(projectId);

  const handleEdit = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  if (!project) {
    return null;
  }

  return (
    <div className="animate-in fade-in duration-500">
      <ProjectDetailsLayout onDelete={handleDelete} onEdit={handleEdit} project={project} />
      <EditProjectDialog onOpenChange={setEditDialogOpen} open={editDialogOpen} project={project} />
      <DeleteProjectDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen} project={project} />
    </div>
  );
}
