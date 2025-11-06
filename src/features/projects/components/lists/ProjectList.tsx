import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import type { PaginationParams, ProjectWithCounts } from '@/shared/types';

import { CardList } from '@/shared/components';
import { Button } from '@/shared/ui/button';

import { useProjects } from '../../api/useProjects';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  onCreateClick: () => void;
  onDeleteClick: (project: ProjectWithCounts) => void;
  onEditClick: (project: ProjectWithCounts) => void;
}

/**
 * ProjectList - Card-based list displaying projects with pagination and actions
 *
 * Displays project information in card format with inline actions for edit/delete operations.
 * Integrates with TanStack Query for data fetching and loading states.
 */
export function ProjectList({ onCreateClick, onDeleteClick, onEditClick }: ProjectListProps) {
  const navigate = useNavigate();
  const pageSize = 50;
  const [paginationParams, setPaginationParams] = useState<PaginationParams>({
    limit: pageSize,
    offset: 0,
  });

  const { data } = useProjects({
    limit: paginationParams.limit ?? pageSize,
    offset: paginationParams.offset ?? 0,
    order: 'name.asc',
  });

  const handleNavigate = useCallback(
    (projectId: string) => {
      navigate(`/projects/${projectId}`);
    },
    [navigate]
  );

  const handlePageChange = useCallback((params: PaginationParams) => {
    setPaginationParams(params);
  }, []);

  const projects = useMemo(() => data.data ?? [], [data]);
  const hasProjects = useMemo(() => Boolean(projects.length), [projects]);

  if (!data) {
    return null;
  }

  if (!hasProjects) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
        data-testid="project-list-empty"
      >
        <p className="text-muted-foreground mb-4">No projects found. Create your first project to get started.</p>
        <Button data-testid="create-project-button-empty" onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </div>
    );
  }

  return (
    <CardList
      actionButton={
        <Button data-testid="create-project-button" onClick={onCreateClick}>
          <Plus />
          <span className="hidden sm:inline">Create project</span>
          <span className="sm:hidden">Create</span>
        </Button>
      }
      data-testid="project-list-table"
      pagination={{
        metadata: data.metadata,
        onPageChange: handlePageChange,
        params: paginationParams,
      }}
    >
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          onDeleteClick={onDeleteClick}
          onEditClick={onEditClick}
          onNavigate={handleNavigate}
          project={project}
        />
      ))}
    </CardList>
  );
}
