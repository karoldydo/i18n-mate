import type { TelemetryEventResponse } from '@/shared/types';

import { useTelemetryKPIs } from '../hooks/useTelemetryKPIs';

interface KPICardProps {
  description: string;
  title: string;
  value: string;
}

interface TelemetryKPIsProps {
  projectCreatedAt: string;
  telemetryEvents: TelemetryEventResponse[];
}

/**
 * TelemetryKPIs - Displays key performance indicators calculated from telemetry events
 *
 * Shows three KPI cards with percentage metrics and averages calculated from
 * telemetry events and project creation date.
 */
export function TelemetryKPIs({ projectCreatedAt, telemetryEvents }: TelemetryKPIsProps) {
  // Calculate KPIs from telemetry events using the hook
  const kpis = useTelemetryKPIs(telemetryEvents, projectCreatedAt);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <KPICard
        description="Time project had multiple languages"
        title="Multi-language Usage"
        value={`${kpis.multiLanguageProjectsPercentage}%`}
      />

      <KPICard
        description="Keys distributed across languages"
        title="Average Keys per Language"
        value={kpis.averageKeysPerLanguage.toFixed(1)}
      />

      <KPICard
        description="Translations completed via AI"
        title="LLM Translations"
        value={`${kpis.llmTranslationsPercentage}%`}
      />
    </div>
  );
}

function KPICard({ description, title, value }: KPICardProps) {
  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="muted-foreground text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="muted-foreground mt-1 text-xs">{description}</p>
        </div>
      </div>
    </div>
  );
}
