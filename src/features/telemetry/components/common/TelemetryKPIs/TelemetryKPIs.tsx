import type { TelemetryEventResponse } from '@/shared/types';

import { useTelemetryKPIs } from '../../../hooks/useTelemetryKPIs';
import { KPICard } from '../../cards/KPICard';

interface TelemetryKPIsProps {
  projectCreatedAt: string;
  telemetryEvents: TelemetryEventResponse[];
}

/**
 * TelemetryKPIs – Displays a summary of key performance indicators for a project.
 *
 * Renders three KPI cards derived from telemetry events and project creation date:
 *  - Multi-language Usage: Percentage of the project's lifetime in which multiple languages were present.
 *  - Average Keys per Language: Mean number of translation keys distributed across all available languages.
 *  - LLM Translations: Percentage of completed translations performed via large language models (AI).
 *
 * @param {Object} props - Component properties
 * @param {string} props.projectCreatedAt - ISO timestamp indicating when the project was created
 * @param {TelemetryEventResponse[]} props.telemetryEvents - Array of project telemetry events used to calculate KPIs
 *
 * @returns {JSX.Element} Responsive grid of KPI cards summarizing project activity
 */
export function TelemetryKPIs({ projectCreatedAt, telemetryEvents }: TelemetryKPIsProps) {
  const kpi = useTelemetryKPIs(telemetryEvents, projectCreatedAt);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <KPICard
        description="Time project had multiple languages"
        title="Multi-language Usage"
        value={`${kpi.multiLanguageProjectsPercentage}%`}
      />
      <KPICard
        description="Keys distributed across languages"
        title="Average Keys per Language"
        value={kpi.averageKeysPerLanguage.toFixed(1)}
      />
      <KPICard
        description="Translations completed via AI"
        title="LLM Translations"
        value={`${kpi.llmTranslationsPercentage}%`}
      />
    </div>
  );
}
