# 6. translation_job_items

Individual keys within a translation job.

```sql
CREATE TABLE translation_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES translation_jobs(id) ON DELETE CASCADE,
  key_id UUID NOT NULL REFERENCES keys(id) ON DELETE CASCADE,
  status item_status NOT NULL DEFAULT 'pending',
  error_code VARCHAR(32),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT translation_job_items_unique_per_job UNIQUE (job_id, key_id)
);

COMMENT ON TABLE translation_job_items IS 'Individual translation tasks within a job';
COMMENT ON COLUMN translation_job_items.error_code IS 'OpenRouter error code (e.g., rate_limit, model_error)';
```
