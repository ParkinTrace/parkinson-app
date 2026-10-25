-- ParkinTrace schema hardening.
--
-- These are constraints the application logic already assumes but the
-- database did not enforce. The migration is deliberately conservative:
--   * the composite FK is added NOT VALID so a pre-existing bad row does
--     not block the deploy; new and updated rows are checked immediately;
--   * the baseline date check is added NOT VALID for the same reason;
--   * the one-building-baseline index fails loudly if existing data has
--     duplicates, because silently deleting rows would be worse.
--
-- If the existing rows are clean, the migration validates both constraints
-- automatically. If they are not, it leaves them NOT VALID and raises a
-- warning so the deploy is not blocked by historic bad data.

-- 1. session_metrics.user_id must match sessions.user_id.
--    sessions.id is already the PK; this unique index gives the composite
--    foreign key a legal target without changing the primary key.
create unique index if not exists sessions_id_user_id_key
  on public.sessions (id, user_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_metrics_session_owner_fkey'
      and conrelid = 'public.session_metrics'::regclass
  ) then
    alter table public.session_metrics
      add constraint session_metrics_session_owner_fkey
      foreign key (session_id, user_id)
      references public.sessions (id, user_id)
      on delete cascade
      not valid;
  end if;
end $$;

-- 2. A baseline window cannot end before it starts.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'baselines_date_order'
      and conrelid = 'public.baselines'::regclass
  ) then
    alter table public.baselines
      add constraint baselines_date_order
      check (baseline_start is null or baseline_end is null or baseline_end >= baseline_start)
      not valid;
  end if;
end $$;

-- 2a. Validate the composite FK if no historic mismatch exists.
do $$
begin
  if not exists (
    select 1
    from public.session_metrics sm
    left join public.sessions s
      on s.id = sm.session_id and s.user_id = sm.user_id
    where s.id is null
  ) then
    alter table public.session_metrics
      validate constraint session_metrics_session_owner_fkey;
  else
    raise warning
      'session_metrics_session_owner_fkey left NOT VALID: historic rows have session_id/user_id mismatches';
  end if;
end $$;

-- 2b. Validate the baseline date check if no historic bad range exists.
do $$
begin
  if not exists (
    select 1
    from public.baselines
    where baseline_start is not null
      and baseline_end is not null
      and baseline_end < baseline_start
  ) then
    alter table public.baselines
      validate constraint baselines_date_order;
  else
    raise warning
      'baselines_date_order left NOT VALID: historic baselines end before they start';
  end if;
end $$;

-- 3. At most one 'building' baseline per user. The API reads the newest
--    baseline and the reset endpoint deletes all of them, so two building
--    rows are ambiguous. Fail with a clear message instead of a generic
--    duplicate-key error if old data already violates this.
do $$
begin
  if exists (
    select 1
    from public.baselines
    where status = 'building'
    group by user_id
    having count(*) > 1
  ) then
    raise exception
      'Cannot create baselines_one_building_per_user_idx: multiple building baselines exist. Resolve duplicates first.';
  end if;
end $$;

create unique index if not exists baselines_one_building_per_user_idx
  on public.baselines (user_id)
  where status = 'building';
