import { useCallback } from 'react';
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

  const handleNavigateToKeys = useCallback(() => {
    navigate(`/projects/${projectId}/keys`);
  }, [navigate, projectId]);

  const handleNavigateToLocales = useCallback(() => {
    navigate(`/projects/${projectId}/locales`);
  }, [navigate, projectId]);

  const handleNavigateToJobs = useCallback(() => {
    navigate(`/projects/${projectId}/translation-jobs`);
  }, [navigate, projectId]);

  const handleNavigateToTelemetry = useCallback(() => {
    navigate(`/projects/${projectId}/telemetry`);
  }, [navigate, projectId]);

  return (
    <Tabs value={activeTab}>
      <TabsList aria-label="Project sections" className="grid w-full grid-cols-4" role="navigation">
        <TabsTrigger aria-label="Navigate to keys" onClick={handleNavigateToKeys} value="keys">
          Keys
        </TabsTrigger>
        <TabsTrigger aria-label="Navigate to locales" onClick={handleNavigateToLocales} value="locales">
          Locales
        </TabsTrigger>
        <TabsTrigger aria-label="Navigate to translation jobs" onClick={handleNavigateToJobs} value="jobs">
          Translation Jobs
        </TabsTrigger>
        <TabsTrigger aria-label="Navigate to telemetry" onClick={handleNavigateToTelemetry} value="telemetry">
          Telemetry
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
