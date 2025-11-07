interface PageHeaderProps {
  projectName?: string;
}

/**
 * PageHeader – Displays a header section for the translation keys page.
 *
 * Renders the main page title ("Translation Keys") and, if a project name is
 * provided, shows it in a contextual subtitle below the heading.
 *
 * @param {Object} props
 * @param {string} [props.projectName] - Optional project or namespace name to display as a subtitle.
 *
 * @returns {JSX.Element} Header UI with title and optional project context.
 */
export function PageHeader({ projectName }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Translation Keys</h1>
      {projectName && <p className="text-muted-foreground mt-1 text-sm">{projectName}</p>}
    </div>
  );
}
