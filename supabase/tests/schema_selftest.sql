-- ParkinTrace schema-hardening self-test (run in the Supabase SQL editor).
--
-- Requires migration 0005_schema_hardening.sql.
-- Creates two disposable auth.users rows, exercises the three new
-- constraints, and deletes the fixtures at the end. It does not touch RLS
-- policies or any real user data.
--
-- The first result must read 'SCHEMA SELFTEST v1'. Every row in the results
-- table must read 'PASS'.

select 'SCHEMA SELFTEST v1' as version;

-- ============ 0. cleanup any previous failed run ============
delete from auth.users where id in (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);

-- ============ 0a. ensure the auth instance row exists ============
insert into auth.instances (id, uuid, raw_base_config, created_at, updated_at)
select gen_random_uuid(), gen_random_uuid(), '{}', now(), now()
where not exists (select 1 from auth.instances);

-- ============ 1. fixture users ============
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
select i.id, '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
       'schema-test-a@example.com', '', now(), now(), now(), '{}', '{}'
from auth.instances i limit 1;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
select i.id, '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
       'schema-test-b@example.com', '', now(), now(), now(), '{}', '{}'
from auth.instances i limit 1;

-- ============ 2. fixture sessions ============
-- Session A and B are owned by their matching users. Session C is owned by A;
-- it is the session used for the mismatched-owner insert.
insert into public.sessions (id, user_id, started_at, ended_at, session_type, device_id)
values
  ('e1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333',
   now() - interval '2 hours', now() - interval '1 hour', 'structured', 'schema-kbd-a'),
  ('e2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444',
   now() - interval '2 hours', now() - interval '1 hour', 'structured', 'schema-kbd-b'),
  ('e3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   now() - interval '3 hours', now() - interval '2 hours', 'structured', 'schema-kbd-a');

-- One building baseline for A, so the unique index has something to reject.
insert into public.baselines (user_id, status, sample_count, distinct_days, baseline_start, baseline_end)
values ('33333333-3333-3333-3333-333333333333', 'building', 3, 2,
        now() - interval '5 days', now());

-- ============ 3. result table ============
drop table if exists pg_temp.schema_selftest_results;
create temp table schema_selftest_results (
  check_name text primary key,
  result text not null
);

-- ============ 4. checks ============
-- Check 1: a metrics row cannot claim a session owned by another user.
do $$
begin
  begin
    insert into public.session_metrics (session_id, user_id)
    values ('e3333333-3333-3333-3333-333333333333',
            '44444444-4444-4444-4444-444444444444');
    insert into schema_selftest_results
    values ('composite FK blocks mismatched session owner', 'FAIL');
  exception when foreign_key_violation then
    insert into schema_selftest_results
    values ('composite FK blocks mismatched session owner', 'PASS');
  end;
end $$;

-- Check 2: a baseline cannot end before it starts.
do $$
begin
  begin
    insert into public.baselines (user_id, status, baseline_start, baseline_end)
    values ('33333333-3333-3333-3333-333333333333', 'established',
            now(), now() - interval '1 day');
    insert into schema_selftest_results
    values ('baseline date order check blocks inverted window', 'FAIL');
  exception when check_violation then
    insert into schema_selftest_results
    values ('baseline date order check blocks inverted window', 'PASS');
  end;
end $$;

-- Check 3: only one building baseline per user.
do $$
begin
  begin
    insert into public.baselines (user_id, status)
    values ('33333333-3333-3333-3333-333333333333', 'building');
    insert into schema_selftest_results
    values ('one building baseline per user', 'FAIL');
  exception when unique_violation then
    insert into schema_selftest_results
    values ('one building baseline per user', 'PASS');
  end;
end $$;

-- Check 4: valid metrics still insert.
do $$
begin
  insert into public.session_metrics (session_id, user_id, features)
  values ('e3333333-3333-3333-3333-333333333333',
          '33333333-3333-3333-3333-333333333333',
          '{"ht_mean": 100}'::jsonb);
  insert into schema_selftest_results
  values ('valid metrics row still inserts', 'PASS');
exception when others then
  insert into schema_selftest_results
  values ('valid metrics row still inserts', 'FAIL');
end $$;

-- Check 5: a valid established baseline still inserts.
do $$
begin
  insert into public.baselines (user_id, status, baseline_start, baseline_end)
  values ('33333333-3333-3333-3333-333333333333', 'established',
          now() - interval '5 days', now());
  insert into schema_selftest_results
  values ('valid established baseline still inserts', 'PASS');
exception when others then
  insert into schema_selftest_results
  values ('valid established baseline still inserts', 'FAIL');
end $$;

-- Check 6: the two supporting indexes exist.
insert into schema_selftest_results
select 'supporting indexes exist',
       case when count(*) = 2 then 'PASS' else 'FAIL' end
from pg_indexes
where schemaname = 'public'
  and indexname in ('sessions_id_user_id_key', 'baselines_one_building_per_user_idx');

-- Check 7: deleting a session removes its metrics row.
delete from public.sessions where id = 'e3333333-3333-3333-3333-333333333333';
insert into schema_selftest_results
select 'session delete cascades metrics',
       case when count(*) = 0 then 'PASS' else 'FAIL' end
from public.session_metrics
where session_id = 'e3333333-3333-3333-3333-333333333333';

-- ============ 5. output ============
select check_name, result
from schema_selftest_results
order by check_name;

-- ============ 6. cleanup ============
delete from auth.users where id in (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);
drop table if exists pg_temp.schema_selftest_results;

select 'SCHEMA SELFTEST COMPLETE' as next_step;
