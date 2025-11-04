import type { ProjectResponse } from '@/shared/types';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { formatDate, formatDateTime } from '@/shared/utils';

interface ProjectMetadataProps {
  project: ProjectResponse;
}

/**
 * ProjectMetadata - Display of immutable project properties
 *
 * Shows prefix, default locale, creation date, and last update date.
 * Includes informational tooltips for immutable fields.
 */
export function ProjectMetadata({ project }: ProjectMetadataProps) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Project Details</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-sm font-medium">
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
          <dd className="mt-1">
            <code className="bg-muted rounded px-2 py-1 font-mono text-sm">{project.prefix}</code>
            <span className="text-muted-foreground ml-2 text-xs">(immutable)</span>
          </dd>
        </div>

        <div>
          <dt className="text-muted-foreground text-sm font-medium">
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
          <dd className="mt-1">
            <code className="bg-muted rounded px-2 py-1 font-mono text-sm">{project.default_locale}</code>
            <span className="text-muted-foreground ml-2 text-xs">(immutable)</span>
          </dd>
        </div>

        <div>
          <dt className="text-muted-foreground text-sm font-medium">Created</dt>
          <dd className="mt-1 text-sm" title={formatDateTime(project.created_at)}>
            {formatDate(project.created_at)}
          </dd>
        </div>

        <div>
          <dt className="text-muted-foreground text-sm font-medium">Last Updated</dt>
          <dd className="mt-1 text-sm" title={formatDateTime(project.updated_at)}>
            {formatDate(project.updated_at)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
