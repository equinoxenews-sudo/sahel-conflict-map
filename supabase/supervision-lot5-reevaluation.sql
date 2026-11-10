-- Supervision V1, Lot 5b : ré-évaluation des publications déjà rattachées (périmètre modifié ou règle corrigée).
-- À coller dans le SQL Editor de la PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT, APRÈS supervision-lot4-collection.sql.
-- Tout est AJOUTÉ. Peut être exécuté plusieurs fois sans dommage.
--
-- Une publication qui ne correspond plus au périmètre est MASQUÉE (hidden_at renseigné, avec la raison écrite), jamais supprimée :
-- si la règle est assouplie plus tard, elle est rétablie à la collecte suivante. Les tableaux ne lisent que les rattachements visibles.

alter table sv_matches add column if not exists hidden_at     timestamptz;
alter table sv_matches add column if not exists hidden_reason text;

-- Les lectures du tableau ne portent que sur les rattachements visibles.
create index if not exists sv_matches_visible_idx on sv_matches (supervision_id) where hidden_at is null;
