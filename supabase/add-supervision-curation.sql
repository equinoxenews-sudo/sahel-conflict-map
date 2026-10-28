-- Supervision : tri éditorial des publications (titre en français, résumé, thèmes, lieu, pertinence) et image.
-- À coller dans le SQL Editor de Supabase APRÈS add-supervision.sql. Que des ajouts de colonnes : rien n'est supprimé ni
-- modifié, et le site actuel (branche main) les ignore. Peut être exécuté plusieurs fois sans dommage.

-- Ce que l'IA tire de la publication elle-même (valable pour toutes les veilles).
alter table supervision_items add column if not exists image_url text;
alter table supervision_items add column if not exists title_fr text;
alter table supervision_items add column if not exists summary_fr text;
alter table supervision_items add column if not exists themes text[];
alter table supervision_items add column if not exists country text;
alter table supervision_items add column if not exists enriched boolean not null default false;

-- Ce qui est propre à une veille : le verdict (garder ou écarter), la pertinence et la raison.
-- Une publication écartée reste enregistrée comme « drop » : elle ne revient pas à chaque collecte.
alter table supervision_matches add column if not exists verdict text not null default 'keep' check (verdict in ('keep', 'drop'));
alter table supervision_matches add column if not exists relevance smallint;
alter table supervision_matches add column if not exists judged boolean not null default false;
alter table supervision_matches add column if not exists judge_note text;
