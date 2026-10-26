-- Remplace les événements fictifs de test par des zones de conflit réelles,
-- mais volontairement génériques (pas d'incident précis inventé, pas de
-- nombre de victimes fabriqué) — en attendant l'intégration ACLED/UCDP.
-- Run in Supabase -> SQL Editor.

delete from conflict_events where external_id like 'TEST-%';

insert into conflict_events
  (external_id, event_date, country, latitude, longitude, category, fatalities, source, notes)
values
  ('ZONE-0001', '2026-09-01', 'Mali',        16.2739,  -0.0446, 'Battles',                     0, 'Zone connue', 'Région de Gao — insurrection jihadiste active (JNIM/ISGS)'),
  ('ZONE-0002', '2026-09-01', 'Burkina Faso', 14.1000,  -1.6167, 'Violence against civilians',  0, 'Zone connue', 'Région de Djibo — zone d''affrontements récurrents'),
  ('ZONE-0003', '2026-09-01', 'Niger',        13.3154,  12.6113, 'Battles',                     0, 'Zone connue', 'Région de Diffa — insurrection jihadiste active'),
  ('ZONE-0004', '2026-09-01', 'RD Congo',     -1.6792,  29.2228, 'Battles',                     0, 'Zone connue', 'Goma / Nord-Kivu — conflit M23'),
  ('ZONE-0005', '2026-09-01', 'Soudan',       13.6289,  25.3494, 'Violence against civilians',  0, 'Zone connue', 'El Fasher, Darfour — guerre civile FSR / armée soudanaise'),
  ('ZONE-0006', '2026-09-01', 'Mozambique',  -10.7500,  40.4700, 'Explosions/Remote violence',  0, 'Zone connue', 'Cabo Delgado — insurrection affiliée à l''État islamique'),
  ('ZONE-0007', '2026-09-01', 'Nigeria',      11.8333,  13.1500, 'Battles',                     0, 'Zone connue', 'Maiduguri, Borno — Boko Haram / ISWAP'),
  ('ZONE-0008', '2026-09-01', 'Somalie',       2.0469,  45.3182, 'Explosions/Remote violence',  0, 'Zone connue', 'Mogadiscio — insurrection Al-Shabaab')
on conflict (external_id) do nothing;
