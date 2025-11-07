import { BackButton } from '@/shared/components';

interface ExportHeaderProps {
  projectId: string;
}

/**
 * ExportHeader - Header section with page title and back navigation to project details
 *
 * Provides page title, description, and navigation back to project details page.
 * Follows the same pattern as other feature pages in the application.
 */
export function ExportHeader({ projectId }: ExportHeaderProps) {
  return (
    <div className="space-y-6">
      <BackButton ariaLabel="Back to project details" buttonLabel="Back to project" to={`/projects/${projectId}`} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Export Translations</h1>
        <p className="text-muted-foreground mt-1">Download all translations for this project as a ZIP archive</p>
      </header>
    </div>
  );
}
