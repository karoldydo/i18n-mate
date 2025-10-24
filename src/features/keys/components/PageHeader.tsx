import { Plus } from 'lucide-react';

import { Button } from '@/shared/ui/button';

interface PageHeaderProps {
  onAddKey: () => void;
  projectName?: string;
}

/**
 * PageHeader - Header section with page title and primary action button
 *
 * Displays the page title and add key button. Optionally shows project name
 * if provided for additional context.
 */
export function PageHeader({ onAddKey, projectName }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Translation Keys</h1>
        {projectName && <p className="text-muted-foreground mt-1 text-sm">{projectName}</p>}
      </div>
      <Button onClick={onAddKey}>
        <Plus className="mr-2 h-4 w-4" />
        Add Key
      </Button>
    </div>
  );
}
