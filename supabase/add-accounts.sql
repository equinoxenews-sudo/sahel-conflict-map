-- Comptes individuels du site (pas d'inscription : chaque compte est créé à la main avec scripts/create-account.ts).
-- Tout est AJOUTÉ : aucune table existante n'est modifiée ni lue. Peut être exécuté plusieurs fois sans dommage.
-- À coller dans le SQL Editor de Supabase.
--
-- Sécurité : RLS activé SANS aucune politique, donc la clé publique (anon) n'a accès à rien. Seul le serveur du site, avec la
-- clé de service, lit cette table (connexion et vérification du compte). Le mot de passe n'est jamais stocké : seulement
-- son hachage salé (scrypt).
--
-- Cloisonnement des dossiers : aucune modification des tables investigation_cloud* n'est nécessaire. Le serveur préfixe
-- la clé des dossiers d'un compte individuel par son identifiant (« marc:<dossier> ») ; les dossiers du compte fondateur
-- gardent leur clé d'origine et ne sont ni migrés ni réécrits.

-- L'identifiant est en minuscules : c'est la clé du compte et le propriétaire de ses données.
create table if not exists accounts (
  identifier     text primary key check (identifier ~ '^[a-z0-9._-]{3,40}$'),
  display_name   text not null,
  password_hash  text not null,
  tier           text not null default 'plus'
                 check (tier in ('owner', 'plus', 'intelligence', 'pro', 'enterprise')),
  timezone       text not null default 'Europe/Paris',
  disabled       boolean not null default false,
  -- Prévus pour l'inscription libre à venir (adresse de contact, dernière connexion, acceptation des conditions).
  email          text,
  last_login_at  timestamptz,
  terms_accepted_at timestamptz,
  created_at     timestamptz not null default now()
);
alter table accounts enable row level security;

-- Suspendre un compte (il perd l'accès dès la requête suivante) :  update accounts set disabled = true where identifier = '...';
