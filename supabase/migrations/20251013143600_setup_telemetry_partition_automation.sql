-- =====================================================================
-- migration: setup telemetry partition automation
-- description: automated monthly partition creation for telemetry_events
-- tables affected: telemetry_events (partition management)
-- notes: uses pg_cron extension for scheduled partition creation;
--        creates partitions 2 months ahead to ensure sufficient buffer;
--        runs on 1st day of each month at 3:00 AM UTC
-- =====================================================================

-- ---------------------------------------------------------------------
-- enable pg_cron extension
-- ---------------------------------------------------------------------

-- pg_cron enables scheduled job execution within postgresql
-- required for automatic partition creation
create extension if not exists pg_cron;

-- grant necessary permissions for cron job execution
grant usage on schema cron to postgres;

-- ---------------------------------------------------------------------
-- partition creation function
-- ---------------------------------------------------------------------

-- automatically creates next month's telemetry_events partition
-- creates partition 2 months ahead to ensure buffer time
-- example: on january 1st, creates partition for march
--
-- rationale:
--   - prevents runtime errors when inserting into non-existent partition
--   - 2-month buffer provides safety margin for missed cron executions
--   - idempotent: safe to run multiple times (uses if not exists)
create or replace function create_next_telemetry_partition()
returns void
language plpgsql
security definer
as $$
declare
  next_month date;
  partition_name text;
  start_date text;
  end_date text;
begin
  -- calculate next month (2 months ahead to ensure partition exists before needed)
  next_month := date_trunc('month', now() + interval '2 months');

  -- generate partition name: telemetry_events_YYYY_MM
  -- example: telemetry_events_2025_03
  partition_name := 'telemetry_events_' || to_char(next_month, 'YYYY_MM');
  start_date := to_char(next_month, 'YYYY-MM-DD');
  end_date := to_char(next_month + interval '1 month', 'YYYY-MM-DD');

  -- create partition if it doesn't exist
  -- uses dynamic sql for partition name and date range
  execute format(
    'create table if not exists %I partition of telemetry_events for values from (%L) to (%L)',
    partition_name, start_date, end_date
  );

  raise notice 'Partition % created or already exists (range: % to %)',
    partition_name, start_date, end_date;
exception
  when others then
    -- log error but don't fail transaction
    -- allows investigation without blocking other operations
    raise warning 'Failed to create partition %: %', partition_name, sqlerrm;
end;
$$;

comment on function create_next_telemetry_partition is
  'Automatically creates telemetry_events partition for 2 months ahead; runs monthly via pg_cron';

-- ---------------------------------------------------------------------
-- ensure telemetry partition exists function
-- ---------------------------------------------------------------------

-- ensures partition exists for current timestamp before insert
-- creates partition if missing, with improved error handling
--
-- rationale:
--   - prevents telemetry insert failures due to missing partitions
--   - fallback mechanism when pg_cron fails to create partitions
--   - lightweight check before expensive partition creation
create or replace function ensure_telemetry_partition_exists(
  p_timestamp timestamptz default now()
)
returns void
language plpgsql
security definer
as $$
declare
  partition_name text;
  start_date text;
  end_date text;
  partition_exists boolean := false;
begin
  -- calculate partition details for the given timestamp
  partition_name := 'telemetry_events_' || to_char(date_trunc('month', p_timestamp), 'YYYY_MM');
  start_date := to_char(date_trunc('month', p_timestamp), 'YYYY-MM-DD');
  end_date := to_char(date_trunc('month', p_timestamp) + interval '1 month', 'YYYY-MM-DD');

  -- check if partition table exists
  select exists(
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = partition_name
      and c.relkind = 'r'
  ) into partition_exists;

  if not partition_exists then
    -- create partition if it doesn't exist
    execute format(
      'create table if not exists %I partition of telemetry_events for values from (%L) to (%L)',
      partition_name, start_date, end_date
    );

    raise notice 'Emergency partition creation: % (range: % to %)',
      partition_name, start_date, end_date;
  end if;

exception
  when others then
    -- log error but don't fail the calling transaction
    raise warning 'Failed to ensure telemetry partition exists for %: %',
      p_timestamp, sqlerrm;
end;
$$;

comment on function ensure_telemetry_partition_exists(timestamptz) is
  'Ensures telemetry_events partition exists for given timestamp; creates if missing. Used as fallback when pg_cron fails to create partitions automatically.';

-- ---------------------------------------------------------------------
-- schedule automatic partition creation
-- ---------------------------------------------------------------------

-- cron expression breakdown:
--   0 - minute (0)
--   3 - hour (3 AM UTC)
--   1 - day of month (1st)
--   * - any month
--   * - any day of week
--
-- execution schedule:
--   runs on 1st day of each month at 3:00 AM UTC
--   low-traffic time to minimize impact
--
-- example execution timeline:
--   2025-01-01 03:00 UTC → creates partition for 2025-03-01 to 2025-04-01
--   2025-02-01 03:00 UTC → creates partition for 2025-04-01 to 2025-05-01
--   2025-03-01 03:00 UTC → creates partition for 2025-05-01 to 2025-06-01
select cron.schedule(
  'create-telemetry-partitions',     -- job name (unique identifier)
  '0 3 1 * *',                       -- cron expression
  'select create_next_telemetry_partition();'
);

-- ---------------------------------------------------------------------
-- verify scheduled job
-- ---------------------------------------------------------------------

-- query to verify job is active
-- uncomment to run manually:
-- select jobid, jobname, schedule, active
-- from cron.job
-- where jobname = 'create-telemetry-partitions';

