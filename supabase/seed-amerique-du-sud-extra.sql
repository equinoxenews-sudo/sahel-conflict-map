-- Points supplémentaires pour l'Amérique du Sud, correspondant aux ~20
-- actualités ajoutées à lib/zoneNews.ts. Même principe que les autres
-- scripts seed-*.sql : zones réelles mais génériques, pas de nombre de
-- victimes inventé.
-- Run in Supabase -> SQL Editor.

insert into conflict_events
  (external_id, event_date, country, latitude, longitude, category, fatalities, source, notes)
values
  ('ZONE3-0001', '2026-08-01', 'Equateur',    -2.1700, -79.9200, 'Battles',                     0, 'Zone connue', 'Guayaquil — conflit armé interne contre les gangs'),
  ('ZONE3-0002', '2026-08-01', 'Haiti',       18.5944, -72.3074, 'Violence against civilians',  0, 'Zone connue', 'Port-au-Prince — contrôle du territoire par les gangs'),
  ('ZONE3-0003', '2026-07-01', 'Bresil',     -22.9068, -43.1729, 'Battles',                     0, 'Zone connue', 'Rio de Janeiro — opérations sécuritaires dans les favelas'),
  ('ZONE3-0004', '2026-07-01', 'Perou',      -12.0464, -77.0428, 'Protests',                    0, 'Zone connue', 'Lima — instabilité politique persistante'),
  ('ZONE3-0005', '2026-06-01', 'Chili',      -38.7359, -72.5904, 'Riots',                       0, 'Zone connue', 'Araucanie — tensions foncières avec les communautés mapuches'),
  ('ZONE3-0006', '2026-06-01', 'Mexique',     24.8091,-107.3940, 'Battles',                     0, 'Zone connue', 'Culiacán, Sinaloa — violence des cartels'),
  ('ZONE3-0007', '2026-06-01', 'Honduras',    14.0723, -87.1921, 'Violence against civilians',  0, 'Zone connue', 'Tegucigalpa — activité des maras et gangs urbains'),
  ('ZONE3-0008', '2026-05-01', 'El Salvador', 13.6929, -89.2182, 'Strategic developments',      0, 'Zone connue', 'San Salvador — régime d''exception prolongé contre les gangs'),
  ('ZONE3-0009', '2026-05-01', 'Guatemala',   14.6349, -90.5069, 'Strategic developments',      0, 'Zone connue', 'Insécurité liée aux réseaux criminels transnationaux'),
  ('ZONE3-0010', '2026-05-01', 'Bolivie',    -16.5000, -68.1500, 'Riots',                       0, 'Zone connue', 'La Paz — tensions politiques et sociales'),
  ('ZONE3-0011', '2026-04-01', 'Argentine',  -34.6037, -58.3816, 'Protests',                    0, 'Zone connue', 'Buenos Aires — contestation liée à la crise économique'),
  ('ZONE3-0012', '2026-04-01', 'Guyana',       7.0000, -58.5000, 'Strategic developments',      0, 'Zone connue', 'Essequibo — différend frontalier avec le Venezuela'),
  ('ZONE3-0013', '2026-04-01', 'Paraguay',   -25.5095, -54.6111, 'Strategic developments',      0, 'Zone connue', 'Ciudad del Este — zone de transit du narcotrafic régional'),
  ('ZONE3-0014', '2026-03-01', 'Nicaragua',   12.1150, -86.2362, 'Strategic developments',      0, 'Zone connue', 'Managua — répression politique continue'),
  ('ZONE3-0015', '2026-03-01', 'Cuba',        23.1136, -82.3666, 'Protests',                    0, 'Zone connue', 'La Havane — crise économique et migratoire'),
  ('ZONE3-0016', '2026-03-01', 'Bresil',      -4.2500, -69.9400, 'Violence against civilians',  0, 'Zone connue', 'Triple frontière amazonienne — orpaillage illégal'),
  ('ZONE3-0017', '2026-02-01', 'Colombie',     4.7110, -74.0721, 'Strategic developments',      0, 'Zone connue', 'Bogotá — négociations de paix fragilisées'),
  ('ZONE3-0018', '2026-02-01', 'Bresil',     -23.5505, -46.6333, 'Strategic developments',      0, 'Zone connue', 'São Paulo — expansion territoriale du PCC'),
  ('ZONE3-0019', '2026-01-01', 'Uruguay',    -34.9011, -56.1645, 'Strategic developments',      0, 'Zone connue', 'Montevideo — vigilance renforcée face au narcotrafic régional')
on conflict (external_id) do nothing;
