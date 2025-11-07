import type { ProjectResponse } from '@/shared/types';

import { BackButton } from '@/shared/components';

import { ProjectHeader } from './ProjectHeader';
import { ProjectMetadata } from './ProjectMetadata';

interface ProjectDetailsLayoutProps {
  onDelete: () => void;
  onEdit: () => void;
  project: ProjectResponse;
}

/**
 * ProjectDetailsLayout – Layout wrapper for the project details page.
 *
 * Structures the details view with:
 *   - Back navigation button to the projects list
 *   - Project header (title, description, edit/delete actions)
 *   - Project metadata summary card (immutable info, stats)
 *
 * Ensures responsive, clear organization of the header and metadata
 * for a consistent page experience.
 *
 * @param {Object} props - Component props
 * @param {() => void} props.onDelete - Handler for deleting the project
 * @param {() => void} props.onEdit - Handler for editing the project
 * @param {ProjectResponse} props.project - Project data to display
 *
 * @returns {JSX.Element} The structured layout for project details
 */
export function ProjectDetailsLayout({ onDelete, onEdit, project }: ProjectDetailsLayoutProps) {
  return (
    <div className="container">
      <div className="space-y-6">
        <div>
          <BackButton
            ariaLabel="Back to projects list"
            buttonLabel="Back to projects"
            dataTestId="back-to-projects-button"
            to="/projects"
          />
        </div>
        <ProjectHeader onDelete={onDelete} onEdit={onEdit} project={project} />
        <ProjectMetadata project={project} />
      </div>
    </div>
  );
}
