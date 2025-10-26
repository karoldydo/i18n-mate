import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '@/shared/ui/button';

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
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Button aria-label="Back to project details" onClick={handleBackClick} size="sm" variant="ghost">
        <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
        Back to Project
      </Button>

      {/* Page Header */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Export Translations</h1>
        <p className="text-muted-foreground mt-1">Download all translations for this project as a ZIP archive</p>
      </header>
    </div>
  );
}
