# 7. telemetry_events (Partitioned)

Application telemetry for analytics and KPIs.

```sql
CREATE TABLE telemetry_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_name event_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  properties JSONB,

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE telemetry_events IS 'Application events for KPI tracking; partitioned monthly; RLS for owner or service_role';
COMMENT ON COLUMN telemetry_events.properties IS 'Event-specific metadata (key_count, locale, mode, etc.)';

-- Create initial partitions (example for 2025)
CREATE TABLE telemetry_events_2025_01 PARTITION OF telemetry_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE telemetry_events_2025_02 PARTITION OF telemetry_events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE telemetry_events_2025_03 PARTITION OF telemetry_events
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
-- Additional partitions created automatically or via cron
```
