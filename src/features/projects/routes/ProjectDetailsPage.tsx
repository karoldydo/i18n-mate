import { useState } from 'react';
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

  // validate UUID format
  const validation = UUID_SCHEMA.safeParse(id);
  const projectId = validation.data ?? '';

  const { data: project, error, isError, isLoading } = useProject(projectId);

  if (!validation.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Invalid Project ID</h2>
          <p className="text-muted-foreground text-sm">The project ID in the URL is not valid.</p>
          <Button className="mt-4" onClick={() => navigate('/projects')} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // loading state
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

  // error state
  if (isError || !project) {
    return (
      <div className="container mx-auto py-8">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <h2 className="text-destructive text-lg font-semibold">Error Loading Project</h2>
          <p className="text-muted-foreground text-sm">{error?.error?.message || 'Failed to load project details.'}</p>
          <Button className="mt-4" onClick={() => navigate('/projects')} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProjectDetailsLayout
        onDelete={() => setDeleteDialogOpen(true)}
        onEdit={() => setEditDialogOpen(true)}
        project={project}
        projectId={projectId}
      />
      <EditProjectDialog
        onOpenChange={setEditDialogOpen}
        open={editDialogOpen}
        project={{ ...project, key_count: 0, locale_count: 0 }}
      />
      <DeleteProjectDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        project={{ ...project, key_count: 0, locale_count: 0 }}
      />
    </>
  );
}
