import { ArrowLeft } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import type { ProjectResponse } from '@/shared/types';

import { Button } from '@/shared/ui/button';

import { ProjectHeader } from './ProjectHeader';
import { ProjectMetadata } from './ProjectMetadata';
import { ProjectNavigation } from './ProjectNavigation';

interface ProjectDetailsLayoutProps {
  onDelete: () => void;
  onEdit: () => void;
  onExport: () => void;
  project: ProjectResponse;
  projectId: string;
}

/**
 * ProjectDetailsLayout - Layout wrapper for the project details view
 *
 * Provides consistent structure with header, navigation tabs, and metadata display.
 * Organizes the view into clear sections with responsive design.
 */
export function ProjectDetailsLayout({ onDelete, onEdit, onExport, project, projectId }: ProjectDetailsLayoutProps) {
  const navigate = useNavigate();

  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <Button
            aria-label="Back to projects list"
            className="mb-4"
            onClick={handleBackToProjects}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
        <ProjectHeader onDelete={onDelete} onEdit={onEdit} onExport={onExport} project={project} />
        <ProjectNavigation projectId={projectId} />
        <ProjectMetadata project={project} />
      </div>
    </div>
  );
}
