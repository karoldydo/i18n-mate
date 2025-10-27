import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

import { UUID_SCHEMA } from '../api/projects.schemas';
import { useProject } from '../api/useProject';
import { DeleteProjectDialog } from '../components/DeleteProjectDialog';
import { EditProjectDialog } from '../components/EditProjectDialog';
import { ProjectDetailsLayout } from '../components/ProjectDetailsLayout';

interface RouteParams {
  id: string;
}

/**
 * ProjectDetailsPage - Main page component for project details view
 *
 * Displays comprehensive project information with navigation to subviews (keys, locales, jobs, telemetry).
 * Supports project management operations (edit, delete) with modal dialogs.
 */
export function ProjectDetailsPage() {
  const { id } = useParams<keyof RouteParams>();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const validation = useMemo(() => UUID_SCHEMA.safeParse(id), [id]);
  const projectId = useMemo(() => validation.data ?? '', [validation.data]);

  const { data: project, error, isError, isLoading } = useProject(projectId);

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

  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={handleBackToProjects} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

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
    <>
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
    </>
  );
}
