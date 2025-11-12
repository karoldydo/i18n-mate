import type { ProjectResponse } from '@/shared/types';

import { CardItem } from '@/shared/components';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { formatDate, formatDateTime } from '@/shared/utils';

interface ProjectMetadataProps {
  project: ProjectResponse;
}

/**
 * ProjectMetadata
 *
 * Displays a horizontal summary table of immutable project metadata and statistics.
 * All read-only fields are visually grouped. Tooltips are provided on immutable
 * properties for discoverability.
 *
 * Fields rendered:
 * - Prefix: unique, immutable project string used as a translation key namespace (tooltip with explanation)
 * - Default Locale: project's source language, immutable after creation (tooltip with explanation)
 * - Languages: total number of locales associated with this project
 * - Keys: total number of translation keys in the project
 * - Created: creation date (formatted; full timestamp shown in tooltip)
 * - Last Updated: timestamp of latest change (formatted; full timestamp shown in tooltip)
 *
 * @param {Object} props
 * @param {ProjectResponse} props.project - The project whose metadata will be displayed.
 *
 * @returns {JSX.Element} Card summary of key project metadata and stats.
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
