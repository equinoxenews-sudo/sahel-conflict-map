-- Zones réelles mais génériques pour Europe, Moyen Orient, Indopacifique et
-- Amérique du Sud — même principe que seed-africa-zones.sql (pas d'incident
-- précis inventé, pas de nombre de victimes fabriqué).
-- Run in Supabase -> SQL Editor.

insert into conflict_events
  (external_id, event_date, country, latitude, longitude, category, fatalities, source, notes)
values
  -- Europe
  ('ZONE2-0001', '2026-09-01', 'Ukraine',           48.5000,  38.0000, 'Battles',                     0, 'Zone connue', 'Donbass — ligne de front active'),
  ('ZONE2-0002', '2026-09-01', 'Serbie',             42.8914,  20.8660, 'Riots',                       0, 'Zone connue', 'Nord du Kosovo — tensions Belgrade/Pristina'),

  -- Moyen Orient
  ('ZONE2-0003', '2026-09-01', 'Israel / Palestine', 31.5000,  34.4700, 'Violence against civilians',  0, 'Zone connue', 'Gaza — conflit israélo-palestinien'),
  ('ZONE2-0004', '2026-09-01', 'Syrie',              33.5138,  36.2765, 'Strategic developments',      0, 'Zone connue', 'Damas — transition post-Assad, instabilité'),
  ('ZONE2-0005', '2026-09-01', 'Yemen',              15.3694,  44.1910, 'Battles',                     0, 'Zone connue', 'Sanaa — guerre civile, conflit houthi'),
  ('ZONE2-0006', '2026-09-01', 'Liban',              33.2000,  35.3000, 'Explosions/Remote violence',  0, 'Zone connue', 'Sud-Liban — tensions Hezbollah/Israël'),

  -- Indopacifique
  ('ZONE2-0007', '2026-09-01', 'Myanmar',            21.9000,  96.1000, 'Battles',                     0, 'Zone connue', 'Guerre civile en cours'),
  ('ZONE2-0008', '2026-09-01', 'Philippines',         7.1900, 124.2400, 'Battles',                     0, 'Zone connue', 'Mindanao — insurrection résiduelle'),
  ('ZONE2-0009', '2026-09-01', 'Taiwan',             24.5000, 119.8000, 'Strategic developments',      0, 'Zone connue', 'Détroit de Taïwan — tensions militaires'),
  ('ZONE2-0010', '2026-09-01', 'Coree du Nord',      38.3000, 127.5000, 'Strategic developments',      0, 'Zone connue', 'Zone démilitarisée — tensions péninsule coréenne'),

  -- Amérique du Sud
  ('ZONE2-0011', '2026-09-01', 'Colombie',            8.3500, -72.9000, 'Battles',                     0, 'Zone connue', 'Catatumbo — dissidences FARC / ELN'),
  ('ZONE2-0012', '2026-09-01', 'Venezuela',          10.4800, -66.9000, 'Riots',                       0, 'Zone connue', 'Caracas — crise politique'),
  ('ZONE2-0013', '2026-09-01', 'Perou',             -12.5000, -73.9000, 'Protests',                    0, 'Zone connue', 'VRAEM — tensions liées au narcotrafic')
on conflict (external_id) do nothing;
