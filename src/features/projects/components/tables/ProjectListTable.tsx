import { MoreVertical, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import type { ProjectWithCounts } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { useProjects } from '../../api/useProjects';

interface ProjectListTableProps {
  onCreateClick: () => void;
  onDeleteClick: (project: ProjectWithCounts) => void;
  onEditClick: (project: ProjectWithCounts) => void;
}

/**
 * ProjectListTable - Data table displaying projects with pagination and actions
 *
 * Displays project information with inline actions for edit/delete operations.
 * Integrates with TanStack Query for data fetching and loading states.
 */
export function ProjectListTable({ onCreateClick, onDeleteClick, onEditClick }: ProjectListTableProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data } = useProjects({
    limit: pageSize,
    offset: page * pageSize,
    order: 'name.asc',
  });

  const handleRowClick = useCallback(
    (projectId: string) => {
      navigate(`/projects/${projectId}`);
    },
    [navigate]
  );

  const handleStopPropagation = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  const handlePreviousPage = useCallback(() => {
    setPage((previousPage) => previousPage - 1);
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((previousPage) => previousPage + 1);
  }, []);

  const handleEditClick = useCallback(
    (project: ProjectWithCounts) => {
      onEditClick(project);
    },
    [onEditClick]
  );

  const handleDeleteClick = useCallback(
    (project: ProjectWithCounts) => {
      onDeleteClick(project);
    },
    [onDeleteClick]
  );

  const projects = data?.data ?? [];
  const total = data?.metadata.total ?? 0;
  const totalPages = Math.max(0, Math.ceil(total / pageSize));
  const lastPageIndex = Math.max(totalPages - 1, 0);

  const isFirstPage = page === 0;
  const isLastPage = page >= lastPageIndex;

  const paginationRange = {
    from: page * pageSize + 1,
    to: Math.min((page + 1) * pageSize, total),
  };

  const hasProjects = projects.length > 0;
  const hasMultiplePages = totalPages > 1;

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
    <div className="space-y-4" data-testid="project-list-table">
      <div className="flex justify-end">
        <Button data-testid="create-project-button" onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Create Project</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Default Language</TableHead>
              <TableHead className="text-right">Languages</TableHead>
              <TableHead className="text-right">Keys</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow
                className="cursor-pointer"
                data-testid={`project-row-${project.id}`}
                key={project.id}
                onClick={() => handleRowClick(project.id)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium" data-testid={`project-name-${project.id}`}>
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="text-muted-foreground text-sm" data-testid={`project-description-${project.id}`}>
                        {project.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="bg-muted rounded px-2 py-1 text-sm" data-testid={`project-prefix-${project.id}`}>
                    {project.prefix}
                  </code>
                </TableCell>
                <TableCell>{project.default_locale}</TableCell>
                <TableCell className="text-right">{project.locale_count}</TableCell>
                <TableCell className="text-right">{project.key_count}</TableCell>
                <TableCell onClick={handleStopPropagation}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-label={`Actions for ${project.name}`} size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(project)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(project)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasMultiplePages && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {paginationRange.from} to {paginationRange.to} of {total} projects
          </p>
          <div className="flex gap-2">
            <Button disabled={isFirstPage} onClick={handlePreviousPage} size="sm" variant="outline">
              Previous
            </Button>
            <Button disabled={isLastPage} onClick={handleNextPage} size="sm" variant="outline">
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
