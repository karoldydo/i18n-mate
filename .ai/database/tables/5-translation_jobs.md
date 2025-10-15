# 5. translation_jobs

LLM translation job tracking.

```sql
CREATE TABLE translation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_locale locale_code NOT NULL,
  target_locale locale_code NOT NULL CHECK (target_locale <> source_locale),
  mode translation_mode NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  provider VARCHAR(64),
  model VARCHAR(128),
  params JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  total_keys INTEGER,
  completed_keys INTEGER DEFAULT 0,
  failed_keys INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4),
  actual_cost_usd NUMERIC(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

  -- Note: source_locale validation (must equal project's default_locale)
  -- enforced via trigger, not CHECK constraint
  -- (PostgreSQL doesn't allow subqueries in CHECK constraints)
);

COMMENT ON TABLE translation_jobs IS 'LLM translation jobs; only one active (pending/running) per project';
COMMENT ON COLUMN translation_jobs.mode IS 'all = all keys; selected = specific keys; single = one key';
COMMENT ON COLUMN translation_jobs.params IS 'LLM parameters: temperature, max_tokens, etc.';
COMMENT ON COLUMN translation_jobs.estimated_cost_usd IS 'Estimated cost before execution';
COMMENT ON COLUMN translation_jobs.actual_cost_usd IS 'Actual cost after completion';
```
