import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/shared/ui/button';

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

  const { data: project, error, isError } = useProject(projectId);

  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

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

  if (isError || !project) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Project</h2>
          <p className="text-muted-foreground text-sm">{error?.error?.message || 'Failed to load project details.'}</p>
          <Button className="mt-4" onClick={handleBackToProjects} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
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
