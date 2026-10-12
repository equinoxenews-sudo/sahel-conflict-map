-- Copie en ligne des dossiers d'investigation (solution temporaire) : permet de retrouver ses
-- dossiers sur un autre appareil. Les dossiers vivent d'abord dans le navigateur (localStorage et
-- IndexedDB) ; « Envoyer » les copie ici, « Récupérer » les rapatrie.
--
-- Sécurité : RLS activé SANS aucune politique, donc la clé publique (anon) n'a accès à rien.
-- Seul le serveur du site, avec la clé de service, lit et écrit ces tables, et uniquement après
-- vérification du mot de passe (le même que /admin/situation : variable ADMIN_PASSWORD).
--
-- À coller dans le SQL Editor de Supabase.

create table if not exists investigation_cloud (
  dossier_id text primary key,
  name text not null,
  description text not null default '',
  -- Version complète actuellement valide (plusieurs morceaux, voir ci-dessous).
  upload_id text not null,
  chunk_count integer not null,
  bytes integer not null default 0,
  entity_count integer not null default 0,
  note_count integer not null default 0,
  uploaded_at timestamptz not null default now()
);

-- Un dossier est découpé en morceaux de ~1,5 Mo (la limite d'une requête sur l'hébergeur est de
-- 4,5 Mo). Un envoi en cours n'abîme jamais la version valide : il écrit sous un nouvel upload_id,
-- qui ne devient la version courante qu'une fois tous les morceaux reçus.
create table if not exists investigation_cloud_chunks (
  dossier_id text not null,
  upload_id text not null,
  seq integer not null,
  data text not null,
  created_at timestamptz not null default now(),
  primary key (dossier_id, upload_id, seq)
);

alter table investigation_cloud enable row level security;
alter table investigation_cloud_chunks enable row level security;
