import type { ProjectResponse } from '@/shared/types';

import { CardItem } from '@/shared/components';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { formatDate, formatDateTime } from '@/shared/utils';

interface ProjectMetadataProps {
  project: ProjectResponse;
}

/**
 * ProjectMetadata - Displays immutable metadata and stats for a project
 *
 * Renders a horizontal property table summarizing core project attributes:
 * - Prefix: unique immutable string used to generate translation keys (shown with tooltip)
 * - Default Locale: source language for translations, immutable (shown with tooltip)
 * - Languages: number of locales assigned to this project
 * - Keys: number of translation keys in the project
 * - Created: project creation date (short format, full timestamp on hover)
 * - Last Updated: last update timestamp (short format, full timestamp on hover)
 *
 * Informational tooltips are displayed for fields that cannot be edited.
 *
 * @param {ProjectMetadataProps} props
 * @param {ProjectResponse} props.project - Project object containing metadata to display
 *
 * @returns {JSX.Element} Metadata summary card for the project
 */
export function ProjectMetadata({ project }: ProjectMetadataProps) {
  return (
    <CardItem className="hover:bg-card">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-row items-center gap-2">
          <dt className="text-muted-foreground text-xs font-medium">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="border-muted-foreground cursor-help border-b border-dotted">Prefix</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Project prefix is immutable and used to generate unique translation keys</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd className="flex items-center gap-2">
            <code className="bg-muted rounded px-2 py-1 font-mono text-xs">{project.prefix}</code>
          </dd>
        </div>
        <div className="flex flex-row items-center gap-2">
          <dt className="text-muted-foreground text-xs font-medium">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="border-muted-foreground cursor-help border-b border-dotted">Default Locale</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Default locale is immutable and serves as the source language for translations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd className="flex items-center gap-2">
            <code className="bg-muted rounded px-2 py-1 font-mono text-xs">{project.default_locale}</code>
          </dd>
        </div>
        <div className="flex flex-row items-center gap-2">
          <dt className="text-muted-foreground text-xs font-medium">Languages</dt>
          <dd className="flex items-center gap-2">
            <code className="bg-muted rounded px-2 py-1 font-mono text-xs">{project.locale_count}</code>
          </dd>
        </div>
        <div className="flex flex-row items-center gap-2">
          <dt className="text-muted-foreground text-xs font-medium">Keys</dt>
          <dd className="flex items-center gap-2">
            <code className="bg-muted rounded px-2 py-1 font-mono text-xs">{project.key_count}</code>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs font-medium">Created</dt>
          <dd className="text-xs" title={formatDateTime(project.created_at)}>
            {formatDate(project.created_at)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs font-medium">Last Updated</dt>
          <dd className="text-xs" title={formatDateTime(project.updated_at)}>
            {formatDate(project.updated_at)}
          </dd>
        </div>
      </div>
    </CardItem>
  );
}
