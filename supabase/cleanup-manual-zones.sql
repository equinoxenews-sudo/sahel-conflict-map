-- Retire les points saisis manuellement (zones "génériques" utilisées comme
-- filet de sécurité avant que le pipeline GDELT ne tourne) — ne garde que
-- les événements réels sourcés automatiquement (préfixe GDELT-).
-- Run in Supabase -> SQL Editor.

delete from conflict_events
where external_id like 'ZONE-%'
   or external_id like 'ZONE2-%'
   or external_id like 'ZONE3-%';
