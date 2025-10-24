import { AlertCircle, MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import type { ProjectWithCounts } from '@/shared/types';

import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { useProjects } from '../api/useProjects';
import { ProjectListTableSkeleton } from './ProjectListTableSkeleton';

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

  const { data, error, isError, isLoading, refetch } = useProjects({
    limit: pageSize,
    offset: page * pageSize,
    order: 'name.asc',
  });

  const handleRowClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const projects = data?.data || [];
  const total = data?.metadata.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return <ProjectListTableSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="mb-2 text-lg font-medium">Failed to load projects</p>
        <p className="text-muted-foreground mb-4 text-sm">{error.error.message || 'An unexpected error occurred'}</p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-muted-foreground mb-4">No projects found. Create your first project to get started.</p>
        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreateClick}>
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
              <TableRow className="cursor-pointer" key={project.id} onClick={() => handleRowClick(project.id)}>
                <TableCell>
                  <div>
                    <p className="font-medium">{project.name}</p>
                    {project.description && <p className="text-muted-foreground text-sm">{project.description}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="bg-muted rounded px-2 py-1 text-sm">{project.prefix}</code>
                </TableCell>
                <TableCell>{project.default_locale}</TableCell>
                <TableCell className="text-right">{project.locale_count}</TableCell>
                <TableCell className="text-right">{project.key_count}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-label={`Actions for ${project.name}`} size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEditClick(project)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => onDeleteClick(project)}>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} projects
          </p>
          <div className="flex gap-2">
            <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)} size="sm" variant="outline">
              Previous
            </Button>
            <Button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} size="sm" variant="outline">
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
