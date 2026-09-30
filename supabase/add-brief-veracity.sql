-- Statut de véracité éditorial par synthèse (remplace l'ancien indice de
-- couverture documentaire 1-5 et la note de fiabilité source A-E, abandonnés
-- au profit d'une seule mention simple). Choisi par l'IA au même titre que
-- category, à partir des sources citées. Run once in Supabase -> SQL Editor.

alter table zone_briefs
  add column if not exists veracity text;
