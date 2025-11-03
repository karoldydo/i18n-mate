-- =====================================================================
-- migration: 08_telemetry_automation
-- description: automated telemetry partition creation and management
-- tables affected: telemetry_events (partition management)
-- notes: uses pg_cron for scheduled partition creation
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_next_telemetry_partition
-- ---------------------------------------------------------------------
create function create_next_telemetry_partition()
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
  partition_name := 'telemetry_events_' || to_char(next_month, 'YYYY_MM');
  start_date := to_char(next_month, 'YYYY-MM-DD');
  end_date := to_char(next_month + interval '1 month', 'YYYY-MM-DD');

  -- create partition if it doesn't exist
  execute format(
    'create table if not exists %I partition of telemetry_events for values from (%L) to (%L)',
    partition_name, start_date, end_date
  );

  -- enable RLS on the partition (inherits policies from parent table)
  execute format('alter table %I enable row level security', partition_name);

  raise notice 'Partition % created or already exists (range: % to %)',
    partition_name, start_date, end_date;
exception
  when others then
    raise warning 'Failed to create partition %: %', partition_name, sqlerrm;
end;
$$;

comment on function create_next_telemetry_partition is
  'Automatically creates telemetry_events partition for 2 months ahead; runs monthly via pg_cron';

-- ---------------------------------------------------------------------
-- ensure_telemetry_partition_exists
-- ---------------------------------------------------------------------
create function ensure_telemetry_partition_exists(
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

    -- enable RLS on the partition (inherits policies from parent table)
    execute format('alter table %I enable row level security', partition_name);

    raise notice 'Emergency partition creation: % (range: % to %)',
      partition_name, start_date, end_date;
  end if;

exception
  when others then
    raise warning 'Failed to ensure telemetry partition exists for %: %',
      p_timestamp, sqlerrm;
end;
$$;

comment on function ensure_telemetry_partition_exists is
  'Ensures telemetry_events partition exists for given timestamp. Fallback when pg_cron fails.';

-- ---------------------------------------------------------------------
-- schedule automatic partition creation
-- ---------------------------------------------------------------------

-- cron expression: 0 3 1 * * (runs on 1st day of each month at 3:00 AM UTC)
-- creates partition 2 months ahead to ensure buffer time
select cron.schedule(
  'create-telemetry-partitions',
  '0 3 1 * *',
  'select create_next_telemetry_partition();'
);

-- verify scheduled job
-- select jobid, jobname, schedule, active from cron.job where jobname = 'create-telemetry-partitions';

-- ---------------------------------------------------------------------
-- enable RLS on existing partition tables
-- ---------------------------------------------------------------------

-- enable RLS on all existing telemetry_events partitions
do $$
declare
  partition_record record;
begin
  for partition_record in
    select c.relname as partition_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_inherits i on i.inhrelid = c.oid
    join pg_class parent on parent.oid = i.inhparent
    where n.nspname = 'public'
      and parent.relname = 'telemetry_events'
      and c.relkind = 'r'
  loop
    execute format('alter table %I enable row level security', partition_record.partition_name);
    raise notice 'Enabled RLS on partition: %', partition_record.partition_name;
  end loop;
end;
$$;
