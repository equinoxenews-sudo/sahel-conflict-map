-- Table storing ACLED conflict events for the Sahel map.
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).

create table if not exists conflict_events (
  id           bigint generated always as identity primary key,
  external_id  text unique not null,       -- ACLED "event_id_cnty", used to avoid duplicate inserts
  event_date   date not null,
  country      text not null,
  latitude     double precision not null,
  longitude    double precision not null,
  category     text not null,              -- ACLED "event_type"
  fatalities   integer not null default 0,
  source       text,
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists conflict_events_country_idx on conflict_events (country);
create index if not exists conflict_events_category_idx on conflict_events (category);
create index if not exists conflict_events_event_date_idx on conflict_events (event_date);

-- Row Level Security: allow public read access (the map is public-facing),
-- writes only happen server-side with the service_role key, which bypasses RLS.
alter table conflict_events enable row level security;

create policy "Public read access"
  on conflict_events
  for select
  using (true);
