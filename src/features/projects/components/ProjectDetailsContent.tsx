import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useProject } from '../api/useProject';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { EditProjectDialog } from './EditProjectDialog';
import { ProjectDetailsLayout } from './ProjectDetailsLayout';

interface ProjectDetailsContentProps {
  projectId: string;
}

/**
 * ProjectDetailsContent - Inner component that uses Suspense query
 *
 * Fetches and displays project details with edit/delete/export actions.
 * Uses useSuspenseQuery for automatic loading state handling via Suspense boundary.
 */
export function ProjectDetailsContent({ projectId }: ProjectDetailsContentProps) {
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: project } = useProject(projectId);

  const handleEdit = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    navigate(`/projects/${projectId}/export`);
  }, [navigate, projectId]);

  const projectWithCounts = useMemo(() => (project ? { ...project, key_count: 0, locale_count: 0 } : null), [project]);

  if (!project) {
    return null;
  }

  return (
    <div className="animate-in fade-in duration-500">
      <ProjectDetailsLayout
        onDelete={handleDelete}
        onEdit={handleEdit}
        onExport={handleExport}
        project={project}
        projectId={projectId}
      />
      {projectWithCounts && (
        <>
          <EditProjectDialog onOpenChange={setEditDialogOpen} open={editDialogOpen} project={projectWithCounts} />
          <DeleteProjectDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen} project={projectWithCounts} />
        </>
      )}
    </div>
  );
}
