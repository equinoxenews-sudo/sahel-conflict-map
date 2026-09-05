# Carte des conflits au Sahel

Carte interactive (Leaflet) des événements de conflit au Mali, Burkina Faso, Niger et
Tchad sur les 30 derniers jours, à partir des données [ACLED](https://acleddata.com/),
stockées dans [Supabase](https://supabase.com/) et déployée sur [Vercel](https://vercel.com/).

## Structure

- `app/page.tsx` — page principale (Server Component), charge les événements depuis Supabase.
- `app/api/sync-acled/route.ts` — endpoint appelé par Vercel Cron pour rafraîchir les données.
- `components/` — `MapView` (état des filtres), `Map` (Leaflet), `Filters`, `Legend`.
- `lib/acled.ts` — appel paginé à l'API ACLED.
- `lib/syncAcled.ts` — orchestration : ACLED → Supabase (upsert).
- `lib/supabaseClient.ts` — client Supabase navigateur/lecture (clé `anon`).
- `lib/supabaseAdmin.ts` — client Supabase serveur/écriture (clé `service_role`).
- `scripts/fetch-acled.ts` — lance `syncAcled` en local (`npm run sync:acled`).
- `supabase/schema.sql` — DDL de la table `conflict_events`.
- `vercel.json` — planifie le cron quotidien vers `/api/sync-acled`.

## 1. Configurer Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécutez le contenu de [`supabase/schema.sql`](./supabase/schema.sql).
3. Dans **Project Settings → API**, récupérez `Project URL`, la clé `anon public` et la clé `service_role`.

## 2. Configurer l'accès ACLED

1. Créez un compte **myACLED** sur [acleddata.com/user/register](https://acleddata.com/user/register).
2. L'API utilise l'email et le mot de passe de ce compte pour obtenir un jeton OAuth
   (`POST https://acleddata.com/oauth/token`, valable 24h) — il n'y a plus de "clé API"
   statique à générer séparément. Voir [acleddata.com/api-documentation](https://acleddata.com/api-documentation/getting-started).
3. `lib/acled.ts` gère l'authentification et la pagination par curseur (`cursor` /
   `next_cursor`), le mode de pagination standard d'ACLED depuis le 1er octobre 2026.

> Si ACLED fait à nouveau évoluer son API après l'écriture de ce projet, seul
> `lib/acled.ts` doit changer — `lib/syncAcled.ts` et le reste du projet n'en dépendent pas.

## 3. Variables d'environnement

Copiez `.env.local.example` vers `.env.local` et remplissez les valeurs :

```bash
cp .env.local.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, utilisée par la carte (lecture seule, RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète, utilisée uniquement côté serveur pour l'ingestion |
| `ACLED_EMAIL` / `ACLED_PASSWORD` | Identifiants du compte myACLED (OAuth) |
| `CRON_SECRET` | Chaîne aléatoire ; protège `/api/sync-acled` contre les appels externes |

## 4. Installer et lancer en local

```bash
npm install
npm run sync:acled   # remplit Supabase avec les 30 derniers jours d'événements ACLED
npm run dev           # http://localhost:3000
```

## 5. Déployer sur Vercel

1. Poussez le repo sur GitHub puis importez-le dans Vercel.
2. Dans **Project Settings → Environment Variables**, ajoutez les mêmes variables que dans `.env.local`.
3. Vercel détecte automatiquement `vercel.json` et planifie l'appel quotidien (3h UTC) à `/api/sync-acled`,
   qui vérifie l'en-tête `Authorization: Bearer $CRON_SECRET` envoyé automatiquement par Vercel Cron.
4. Pour forcer une synchronisation manuelle en production, appelez la route avec le même secret :

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<votre-app>.vercel.app/api/sync-acled
```
