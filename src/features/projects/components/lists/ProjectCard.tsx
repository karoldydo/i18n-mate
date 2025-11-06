import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import type { ProjectWithCounts } from '@/shared/types';

import { CardItem } from '@/shared/components';
import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';

interface ProjectCardProps {
  onDeleteClick: (project: ProjectWithCounts) => void;
  onEditClick: (project: ProjectWithCounts) => void;
  onNavigate: (projectId: string) => void;
  project: ProjectWithCounts;
}

/**
 * ProjectCard – Presents an individual project's summary and actions in a card UI.
 *
 * @component
 *
 * @param {Object} props - Component props
 * @param {ProjectWithCounts} props.project - The project data to display
 * @param {(projectId: string) => void} props.onNavigate - Called when the card is clicked, to navigate to the project detail route
 * @param {(project: ProjectWithCounts) => void} props.onEditClick - Called when the Edit action is clicked (passes the project)
 * @param {(project: ProjectWithCounts) => void} props.onDeleteClick - Called when the Delete action is clicked (passes the project)
 *
 * @returns {JSX.Element} Card structure displaying project name, description, key stats, and an action dropdown.
 *
 * @example
 * <ProjectCard
 *   project={project}
 *   onNavigate={handleProjectNavigate}
 *   onEditClick={openEditDialog}
 *   onDeleteClick={openDeleteDialog}
 * />
 *
 * Layout:
 * - Project name (always shown)
 * - Description (if present)
 * - Metadata: prefix, default locale
 * - Statistics: languages count, translation keys count
 * - Actions: Edit and Delete options via dropdown menu (three-dot button)
 */
export function ProjectCard({ onDeleteClick, onEditClick, onNavigate, project }: ProjectCardProps) {
  const handleClick = useCallback(() => {
    onNavigate(project.id);
  }, [onNavigate, project.id]);

  const handleEditClick = useCallback(() => {
    onEditClick(project);
  }, [onEditClick, project]);

  const handleDeleteClick = useCallback(() => {
    onDeleteClick(project);
  }, [onDeleteClick, project]);

  return (
    <CardItem
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`Actions for ${project.name}`} size="icon" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={handleDeleteClick}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      data-testid={`project-card-${project.id}`}
      onClick={handleClick}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between md:items-center">
        {/* primary information */}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold" data-testid={`project-name-${project.id}`}>
            {project.name}
          </h3>
          {project.description && (
            <p className="text-muted-foreground mt-1 text-xs" data-testid={`project-description-${project.id}`}>
              {project.description}
            </p>
          )}
        </div>

        {/* metadata and metrics */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          {/* prefix */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Prefix</span>
            <code className="bg-muted rounded px-2 py-0.5" data-testid={`project-prefix-${project.id}`}>
              {project.prefix}
            </code>
          </div>

          {/* default language */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Default</span>
            <code
              className="bg-muted rounded px-2 py-0.5 font-medium"
              data-testid={`project-default-locale-${project.id}`}
            >
              {project.default_locale}
            </code>
          </div>

          {/* languages count */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Languages</span>
            <code
              className="bg-muted rounded px-2 py-0.5 font-medium"
              data-testid={`project-locale-count-${project.id}`}
            >
              {project.locale_count}
            </code>
          </div>

          {/* key count */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Keys</span>
            <code className="bg-muted rounded px-2 py-0.5 font-medium" data-testid={`project-key-count-${project.id}`}>
              {project.key_count}
            </code>
          </div>
        </div>
      </div>
    </CardItem>
  );
}
