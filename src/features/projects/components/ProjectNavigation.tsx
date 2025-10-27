import { useNavigate } from 'react-router';

import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';

interface ProjectNavigationProps {
  activeTab?: 'jobs' | 'keys' | 'locales' | 'telemetry';
  projectId: string;
}

/**
 * ProjectNavigation - Tab-based navigation to project sub-views
 *
 * Provides navigation tabs for Keys, Locales, Translation Jobs, and Telemetry views.
 * Manages active state and handles navigation to respective routes.
 */
export function ProjectNavigation({ activeTab, projectId }: ProjectNavigationProps) {
  const navigate = useNavigate();

  return (
    <Tabs value={activeTab}>
      <TabsList aria-label="Project sections" className="grid w-full grid-cols-4" role="navigation">
        <TabsTrigger aria-label="Navigate to keys" onClick={() => navigate(`/projects/${projectId}/keys`)} value="keys">
          Keys
        </TabsTrigger>
        <TabsTrigger
          aria-label="Navigate to locales"
          onClick={() => navigate(`/projects/${projectId}/locales`)}
          value="locales"
        >
          Locales
        </TabsTrigger>
        <TabsTrigger
          aria-label="Navigate to translation jobs"
          onClick={() => navigate(`/projects/${projectId}/translation-jobs`)}
          value="jobs"
        >
          Translation Jobs
        </TabsTrigger>
        <TabsTrigger
          aria-label="Navigate to telemetry"
          onClick={() => navigate(`/projects/${projectId}/telemetry`)}
          value="telemetry"
        >
          Telemetry
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
