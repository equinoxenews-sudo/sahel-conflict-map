-- Fake test events to verify the map/filters end-to-end while waiting for
-- ACLED API access approval. Safe to re-run (ON CONFLICT does nothing).
-- Run in Supabase -> SQL Editor.

insert into conflict_events
  (external_id, event_date, country, latitude, longitude, category, fatalities, source, notes)
values
  ('TEST-0001', '2026-08-10', 'Mali',          12.6392, -8.0029, 'Battles',                     4, 'Test data', 'Événement fictif — Bamako'),
  ('TEST-0002', '2026-08-14', 'Mali',          16.2739, -0.0446, 'Explosions/Remote violence',   2, 'Test data', 'Événement fictif — Gao'),
  ('TEST-0003', '2026-08-18', 'Burkina Faso',  12.3714, -1.5197, 'Protests',                     0, 'Test data', 'Événement fictif — Ouagadougou'),
  ('TEST-0004', '2026-08-20', 'Burkina Faso',  14.1000, -1.6167, 'Violence against civilians',   6, 'Test data', 'Événement fictif — Djibo'),
  ('TEST-0005', '2026-08-24', 'Niger',         13.5117,  2.1251, 'Riots',                        1, 'Test data', 'Événement fictif — Niamey'),
  ('TEST-0006', '2026-08-27', 'Niger',         13.3154, 12.6113, 'Battles',                      9, 'Test data', 'Événement fictif — Diffa'),
  ('TEST-0007', '2026-08-30', 'Chad',          12.1348, 15.0557, 'Strategic developments',       0, 'Test data', 'Événement fictif — N''Djamena'),
  ('TEST-0008', '2026-09-02', 'Chad',          13.0000, 14.0000, 'Explosions/Remote violence',   3, 'Test data', 'Événement fictif — Lac Tchad')
on conflict (external_id) do nothing;

-- To remove all test rows later (once real ACLED data is flowing):
-- delete from conflict_events where external_id like 'TEST-%';
