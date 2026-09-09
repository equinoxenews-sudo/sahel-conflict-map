-- Snapshot of vessel positions near a handful of maritime chokepoints
-- relevant to the tracked zones (Red Sea, Strait of Hormuz, Gulf of
-- Guinea, Taiwan Strait, Black Sea), refreshed once a day by
-- lib/syncVessels.ts. Not a live feed — AISstream is WebSocket-only with
-- a 3-connections-per-account/IP limit, so a brief daily connection that
-- stores a snapshot is the model that fits Vercel Hobby's once-daily cron.
-- Run once in Supabase -> SQL Editor.

create table if not exists vessel_positions (
  mmsi        text primary key,
  ship_name   text,
  latitude    double precision not null,
  longitude   double precision not null,
  speed       double precision,
  course      double precision,
  region      text,
  updated_at  timestamptz not null default now()
);

create index if not exists vessel_positions_region_idx on vessel_positions (region);

alter table vessel_positions enable row level security;

create policy "Public read access"
  on vessel_positions
  for select
  using (true);
