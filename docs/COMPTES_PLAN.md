# Comptes individuels — plan (branche `comptes-v1`)

Objectif : ouvrir le site à trois comptes individuels (Accueil, Approche, Actualités, Analyse des zones, Mon espace avec
Notes, Graph, Outils et le carrousel du Menu). Investigation, Supervision et Tracking restent réservés à Nicolas et
affichent « Bientôt » aux autres. Écrit AVANT toute ligne de code ; rien n'est implémenté tant que Nicolas n'a pas
répondu aux questions de la fin.

Constat de départ (vérifié dans le code de `main`, 30/10/2026) :

- Un seul compte : Nicof (ou `ADMIN_USER`), mot de passe `ADMIN_PASSWORD`. Cookie `equinoxe_session` = empreinte
  SHA-256 salée. `isAdmin()` vaut « connecté ».
- `AGENTS.md` n'existe pas à la racine de `main` (ni sur `supervision-v1`) ; la doc du moteur sera lue dans
  `node_modules/next/dist/docs/` au moment de coder (le worktree n'a pas encore de `node_modules`).
- `/api/investigation/cloud*` : aucune notion de propriétaire. Les tables `investigation_cloud` (clé `dossier_id`) et
  `investigation_cloud_chunks` sont lues et écrites par n'importe quel connecté. Avec plusieurs comptes, tout le monde
  verrait et pourrait écraser les dossiers de Nicolas.
- Navigateur : `localStorage` (`equinoxe-investigation-v1`, `equinoxe-investigation-sync-v1`) et trois bases IndexedDB
  (`equinoxe-investigation-images`, `-files`, `-backups`) ne sont pas séparées par compte.
- `app/mon-espace/supervision` et `tracking` sont déjà des pages « Bientôt » pour tout le monde.
  `app/mon-espace/investigation/page.tsx` contient la **recherche OSINT** (`OsintSearchPanel`, liens vers des outils
  externes) : elle reste pour Nicolas, et devient « Bientôt » pour les autres.
- `/admin/situation` (relecture des points de situation) utilise `isAdmin()` : doit rester réservé à Nicolas.

## 1. Ce qu'on reprend de `supervision-v1` (comptes seulement)

| Reprise | Détail |
|---|---|
| `lib/accounts.ts` | Tel quel (octet pour octet, pour une fusion future sans conflit) : hachage scrypt, session signée HMAC, offres. |
| `lib/accountStore.ts` | Tel quel : `authenticate`, `loadActiveAccount` (table `accounts`, lisible par la clé de service seulement). |
| `lib/adminAuth.ts` | `currentAccount()`, `sessionTokenFor()`, `isValidSessionToken` acceptant aussi les sessions signées. Adapté (voir §3). |
| `app/api/admin/login/route.ts` | Connexion : comptes individuels d'abord, puis fondateur (`ADMIN_PASSWORD`). |
| `app/acces/page.tsx` | `currentAccount()` à la place de `isAdmin()`. |
| `scripts/create-account.ts` | Adapté : offre par défaut `plus`, refuse l'identifiant du fondateur. |
| `tests/accounts.test.ts` | Tel quel. |
| SQL | Seulement le bloc 1 (table `accounts`), dans un nouveau `supabase/add-accounts.sql` (`create table if not exists`, donc rejouable et compatible avec `add-supervision.sql` plus tard). |

**Non repris** : tout `lib/supervision/`, `components/supervision/`, `app/api/supervision/`, les tables `supervision_*`,
les colonnes `ai_usage`, le plafond de budget par compte. Non repris non plus : `owner_id text not null default 'nicof'`
sur `investigation_cloud` (voir §2 : il suppose la valeur de `ADMIN_USER`, exige un SQL exécuté AVANT le déploiement
sous peine de casser la copie en ligne de Nicolas, et ne protège pas les morceaux).

Fusion future de `supervision-v1` : `adminAuth.ts`, la route de connexion et `acces/page.tsx` seront à résoudre en
gardant la version de `comptes-v1` ; le reste est identique ou disjoint.

## 2. Cloisonnement des dossiers (obligatoire, avant tout deuxième compte)

### Serveur (copie en ligne)

Principe : le propriétaire n'est **jamais** lu dans la requête, il vient uniquement de la session. La clé stockée en base
est construite côté serveur :

- compte fondateur : `dossier_id` inchangé (aucune ligne existante n'est modifiée ni migrée) ;
- compte individuel `marc` : `dossier_id = "marc:<id du dossier>"`.

L'identifiant envoyé par le navigateur est validé par `^[A-Za-z0-9_-]{1,80}$` : il ne peut donc contenir ni `:` ni
autre séparateur. Une clé de fondateur ne peut ainsi jamais être égale à une clé de compte individuel, et un compte ne
peut pas fabriquer la clé d'un autre. Toutes les fonctions de `lib/investigationCloud.ts` prennent un propriétaire en
premier argument et passent par `cloudKey(owner, id)` :

- liste : filtre `dossier_id like 'marc:%'` (fondateur : `not like '%:%'`) ; les identifiants renvoyés sont dépouillés du préfixe ;
- lecture, versions, morceaux, envoi, validation, suppression : clé construite par le serveur ;
- les deux tables gardent RLS activé sans politique (la clé publique n'a accès à rien) ; le filtre est côté serveur.

**Aucun SQL à exécuter pour le cloisonnement** : les dossiers de Nicolas (dont l'enquête APN) ne sont pas touchés, ni
renommés, ni réécrits. C'est la propriété de sécurité la plus importante du plan.

Les routes `/api/investigation/cloud*` passent de `isAdmin()` à `currentAccount()` (n'importe quel compte valide, mais
cloisonné). Tests : un compte B ne liste, ne lit, n'écrase ni ne supprime jamais un dossier de A ni du fondateur, même
en envoyant exactement le même identifiant de dossier ; le fondateur ne voit pas les dossiers des comptes.

### Navigateur (même appareil, même profil)

- Un module `lib/investigation/scope.ts` fournit `scopedKey(base)` et `scopedDbName(base)`.
- **Fondateur : portée vide, donc clés strictement inchangées** (`equinoxe-investigation-v1`, mêmes bases IndexedDB).
  Aucune migration, aucune copie, aucune suppression : pas de risque de perte pour le dossier de Nicolas. Un test fige
  les noms historiques.
- **Compte individuel `marc`** : `equinoxe-investigation-v1:marc`, `equinoxe-investigation-sync-v1:marc`,
  `equinoxe-investigation-images:marc`, `-files:marc`, `-backups:marc`.
- La portée vient du **serveur** (le layout de `/mon-espace` la passe à `InvestigationProvider`, lui-même remonté à
  chaque changement de compte via `key`), pas d'un état client modifiable : l'espace n'affiche jamais les données d'un
  autre compte, y compris après un changement de compte sans rechargement complet.
- Sans compte connecté, aucune donnée n'est lue (le layout affiche la connexion).

Limite honnête : c'est un cloisonnement applicatif. Quelqu'un qui ouvre les outils de développement du même profil
Chrome peut lire les clés des autres comptes (les données locales ne sont pas chiffrées). Pour une séparation physique,
chaque personne doit utiliser son propre profil ou appareil. À dire aux trois personnes.

## 3. Droits : Investigation, Supervision, Tracking

Pilotage par **offre du compte** (`tier`, déjà dans le modèle repris), pas par masquage CSS :

- `lib/espaceAccess.ts` (module pur, testé) : `canOpen(account, section)` ; `investigation`, `supervision` et
  `tracking` exigent l'offre `owner` ; `menu`, `notes`, `graph`, `outils` sont ouverts à tout compte. Le jour où
  Supervision s'ouvre à une offre, on change une ligne.
- Les trois comptes reçoivent l'offre `plus` (la plus basse) ; Nicolas est `owner` (compte fondateur, sans ligne en base).
- **Côté serveur** : `investigation/page.tsx`, `supervision/page.tsx` et `tracking/page.tsx` deviennent des composants
  serveur qui lisent `currentAccount()` ; sans droit, ils ne rendent que `ComingSoon` (le contenu réel n'est ni
  rendu ni envoyé dans la réponse HTML). Même règle pour toute future route d'API de ces rubriques (garde `requireOwner`).
- `currentAccount()` relit le compte en base à chaque vérification serveur pour les comptes individuels : un compte
  suspendu (`disabled`) ou rétrogradé perd l'accès immédiatement, sans attendre l'expiration du cookie de sept jours.
  Si la base est injoignable, un compte individuel est refusé (échec fermé) ; le fondateur, lui, ne dépend pas de la base.
  La porte d'entrée (`proxy.ts`) ne vérifie que la signature, sans appel réseau.
- `/admin/situation` et ses routes : réservés au fondateur (`tier === "owner"`).
- **Menu** : le layout calcule les rubriques verrouillées et les passe à `EspaceShell` / `EspaceRail` : les entrées
  Investigation, Supervision et Tracking restent visibles avec une pastille « Bientôt » ; la page du Menu remplace les
  tuiles « Ma supervision » et « Mon tracking » par « Bientôt » (elles invitent aujourd'hui à « Ouvrir une enquête »).
- Textes « Bientôt » (même ton que Supervision, sans date) rédigés pour les trois rubriques :
  - **Investigation** : la recherche sur une personne, une société, un numéro ou une adresse dans les sources ouvertes ;
    les outils externes s'ouvrent avec la requête déjà préparée ; les résultats directs dans Équinoxe viennent ensuite.
  - **Supervision** : texte actuel conservé (veille sur mesure, une enquête par compte, carte, résumé, alertes).
  - **Tracking** : texte actuel conservé (navires et avions choisis, contrôle quotidien, avions d'abord).
- Nicolas voit exactement ce qu'il voit aujourd'hui (aucune page, aucune clé, aucun cookie ne change pour lui).

## 4. Connexion et création des comptes

- Connexion : `authenticate()` (table `accounts`) puis, à défaut, mot de passe fondateur. Le cookie du fondateur reste
  le même jeton (sa session actuelle survit au déploiement). Secret de signature des sessions individuelles dérivé de
  `SUPABASE_SERVICE_ROLE_KEY` (déjà présent) : **aucune nouvelle variable Vercel**.
- Un mot de passe faux fait toujours attendre 900 ms ; mot de passe d'au moins 10 caractères pour les comptes.
- Je ne vois jamais de mot de passe : `npx tsx scripts/create-account.ts` demande l'identifiant, l'offre et le mot de
  passe **dans le terminal de Nicolas** (saisie masquée) et n'imprime que l'`insert` SQL avec le hachage salé. Nicolas le
  colle dans le SQL Editor de Supabase. Pour mes essais, des comptes de test locaux avec des valeurs générées dans un
  fichier de seed d'exemple (`scripts/seed-test-accounts.example.ts`, jamais des comptes réels).

## 5. Vérification prévue

1. `npx tsx --test tests/*.test.ts` et `npx tsc --noEmit` au vert. Nouveaux tests : cloisonnement serveur (faux client
   Supabase en mémoire), portée navigateur (noms historiques figés, aucun nom de compte égal à un nom historique),
   droits par rubrique, menu sans accès actif pour un compte limité, session signée / compte suspendu.
2. Preview locale avec deux comptes de test : A crée un dossier (notes + graphe), B ne le voit ni dans Notes, ni dans
   Graph, ni dans le Menu, ni dans la copie en ligne, y compris après rechargement et dans le même navigateur ; le
   fondateur et A/B ne se voient pas non plus ; A/B ouvrent `/mon-espace/investigation` et reçoivent « Bientôt ».
3. Un dossier pré-existant dans les clés historiques reste intact et n'apparaît que pour le fondateur.

## 6. Ce que Nicolas aura à faire lui-même (à la livraison)

1. Supabase > SQL Editor : exécuter `supabase/add-accounts.sql` (crée la table `accounts` ; rien d'existant n'est modifié).
2. Pour chacun des trois comptes : `npx tsx scripts/create-account.ts` dans son terminal, saisir le mot de passe, coller
   le SQL obtenu dans Supabase.
3. Vercel : aucune variable à ajouter. Merger `comptes-v1` sur `main` quand la preview est validée (je ne le fais pas).
4. Ordre sûr : déployer le code avant ou après le SQL est sans danger (sans table `accounts`, la connexion des comptes
   échoue proprement et celle de Nicolas continue de marcher).

## Questions bloquantes pour Nicolas

a. Les trois identifiants à créer (3 à 40 caractères : lettres, chiffres, `.` `_` `-`), et si ton compte Nicof compte
   parmi les trois (dans ce cas il en faut deux nouveaux seulement).
b. Nicof garde-t-il l'accès complet à Investigation, Supervision et Tracking (prévu : oui) ?
c. OK pour que le SQL de création des comptes soit produit par le script `scripts/create-account.ts` que tu lances toi-même ?
