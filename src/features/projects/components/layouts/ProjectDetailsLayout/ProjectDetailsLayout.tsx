import type { ProjectResponse } from '@/shared/types';

import { BackButton, PageHeader } from '@/shared/components';

import { ProjectActions } from '../ProjectActions/ProjectActions';
import { ProjectMetadata } from '../ProjectMetadata/ProjectMetadata';

interface ProjectDetailsLayoutProps {
  onDelete: () => void;
  onEdit: () => void;
  project: ProjectResponse;
}

/**
 * ProjectDetailsLayout – Page layout component for displaying the details of a single project.
 *
 * Organizes the project details view into clearly defined sections:
 *   - Back navigation button leading users to the projects overview list
 *   - Prominent header showing the project name; description is shown as a subheading when present
 *   - Inline edit and delete action buttons for quick project management
 *   - Summary card rendering key project metadata and immutable information
 *
 * Promotes a consistent and accessible page structure with logical grouping of project information
 * and actions. Designed to be used within a route/page responsible for rendering a specific project's details.
 *
 * @param {ProjectDetailsLayoutProps} props - Props for ProjectDetailsLayout
 * @param {() => void} props.onDelete - Callback invoked when the delete action is triggered
 * @param {() => void} props.onEdit - Callback invoked when the edit action is triggered
 * @param {ProjectResponse} props.project - The project data to render in the layout
 *
 * @returns {JSX.Element} A container with back navigation, header, actions, and metadata for the project
 */
export function ProjectDetailsLayout({ onDelete, onEdit, project }: ProjectDetailsLayoutProps) {
  return (
    <div className="container">
      <div className="space-y-6">
        <BackButton
          ariaLabel="Back to projects list"
          buttonLabel="Back to projects"
          dataTestId="back-to-projects-button"
          to="/projects"
        />
        <PageHeader header={project.name} subHeading={project.description} />
        <ProjectActions onDelete={onDelete} onEdit={onEdit} />
        <ProjectMetadata project={project} />
      </div>
    </div>
  );
}
