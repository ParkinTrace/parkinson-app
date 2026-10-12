-- ParkinTrace treatment event timeline schema.
-- Privacy-conscious recording of clinician-directed treatment events.
-- Real owner-only RLS: authenticated users only access their own events.

create table if not exists public.treatment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_date timestamptz not null,
  event_type text not null check (event_type in ('medication_change', 'dosage_adjustment', 'therapy_start', 'other')),
  description text not null,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists treatment_events_user_date_idx on public.treatment_events (user_id, event_date desc);

alter table public.treatment_events enable row level security;

drop policy if exists treatment_events_owner on public.treatment_events;
create policy treatment_events_owner on public.treatment_events
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.treatment_events to authenticated;
