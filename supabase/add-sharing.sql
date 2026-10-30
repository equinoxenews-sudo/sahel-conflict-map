-- Profil, IDcode et partage de dossiers entre comptes. Tout est AJOUTÉ : aucune table existante n'est modifiée.
-- Peut être exécuté plusieurs fois sans dommage. À coller dans le SQL Editor de Supabase.
--
-- Sécurité : RLS activé SANS aucune politique, donc la clé publique (anon) n'a accès à rien. Seul le serveur du site
-- (clé de service) lit et écrit ces tables.

-- 1. IDcode de chaque compte (le fondateur compris : sa clé est son identifiant normalisé, « nicof » par défaut).
--    Avec le pseudo, il permet à une autre personne de partager un dossier ou un graph. 8 caractères, voir lib/accountProfile.ts.
create table if not exists account_codes (
  owner_id   text primary key,
  code       text not null unique check (code ~ '^[A-HJKMNP-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);
alter table account_codes enable row level security;
