interface PageHeaderProps {
  projectName?: string;
}

/**
 * PageHeader - Header section with page title
 *
 * Displays the page title. Optionally shows project name
 * if provided for additional context.
 */
export function PageHeader({ projectName }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Translation Keys</h1>
      {projectName && <p className="text-muted-foreground mt-1 text-sm">{projectName}</p>}
    </div>
  );
}
