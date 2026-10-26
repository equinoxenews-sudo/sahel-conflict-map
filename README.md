# Équinoxe News

Site indépendant de veille géopolitique et d'analyse (OSINT) : globe interactif des événements, synthèses
quotidiennes rédigées par des analystes de zone (IA, avec relecture humaine), points de situation, fiches pays,
et un espace privé « Mon espace » (dossiers, notes, graphes, recherche, supervision, suivi, outils). Cinq zones suivies : Afrique, Europe, Moyen-Orient, Indopacifique,
Amérique du Sud.

> Le dépôt s'appelle encore `sahel-conflict-map` : c'est le nom du projet d'origine (une carte des conflits du Sahel).

## Pile technique

Next.js 16 (App Router) sur Vercel (plan Hobby) · Supabase (base, lecture publique protégée par RLS) · GitHub Actions
(traitements longs) · API Anthropic (rédaction) · CesiumJS (globe) · React Flow et Tiptap (Investigation).
`AGENTS.md` rappelle que cette version de Next.js diffère de celle que l'on connaît : lire `node_modules/next/dist/docs/`
avant de coder.

## Où est quoi

| Dossier | Contenu |
|---|---|
| `app/` | Pages (`/` accueil et globe, `/zones/[slug]/…`, `/briefs/[id]`, `/a-propos`, `/mon-espace/…` (menu, notes, graph, investigation, supervision, tracking, outils), `/admin/situation`) et routes `app/api/*` (collecte, rédaction, recherche, session, cloud des dossiers). |
| `components/` | Composants de l'interface, un dossier par domaine (`equinoxe/`, `investigation/`, `situation/`, `search/`, `espace/`…). |
| `lib/` | Logique métier : collecte (`sync*.ts`), rédaction (`synthesizeBriefs.ts`, `zoneSynthesis.ts`), budget IA (`aiBudget.ts`, `aiUsage.ts`), recherche (`search*.ts`), Investigation (`investigation/`). |
| `scripts/` | Traitements lancés par GitHub Actions (`zone-synthesis.ts`, `situation-report.ts`, …) et outils de génération. |
| `supabase/` | Schéma et migrations `add-*.sql` ; scripts ponctuels dans `archive/`. |
| `.github/workflows/` | Les workflows planifiés (voir la journée type). |
| `docs/` | `JOURNEE_TYPE.md` (toutes les automatisations), notes d'audit. |
| `tests/` | Tests unitaires et de cohérence (horaires, routes, workflows). |

## Les automatisations

Tout ce qui tourne chaque jour (collecte, synthèses, point de situation, passage de l'après-midi), leurs horaires,
leurs dépendances et la marche à suivre aux changements d'heure sont décrits dans
**[`docs/JOURNEE_TYPE.md`](./docs/JOURNEE_TYPE.md)**.

## Installer et lancer en local

```bash
cp .env.local.example .env.local   # puis remplir les valeurs (voir le fichier, tout y est commenté)
npm install
npm run dev                         # http://localhost:3000
```

Contrôles avant de pousser :

```bash
npx tsc --noEmit
npm run lint
npx tsx --test tests/*.test.ts
```

Hors ligne, ou sans accès à Supabase, l'accueil s'affiche sans données et un build complet signale des échecs
réseau : ce n'est pas bloquant, le build de Vercel dispose du réseau.

## Base de données (Supabase)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécuter `supabase/schema.sql` et `supabase/schema-articles.sql`, puis les fichiers
   `supabase/add-*.sql` (écrits pour pouvoir être relancés sans danger).
3. Dans **Project Settings → API**, récupérer l'URL du projet, la clé `anon` et la clé `service_role`.

## Déploiement

- **Vercel :** import du dépôt, mêmes variables que `.env.local`. `vercel.json` planifie les collectes et réveille
  les workflows GitHub (route `/api/cron/dispatch`).
- **GitHub :** secrets et variables listés en tête de `.env.local.example` ; les workflows épinglent
  `ubuntu-24.04`.
- Les routes planifiées exigent `Authorization: Bearer <CRON_SECRET>` et refusent tout si le secret est absent.

Relancer un traitement à la main, par exemple la collecte :

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<votre-app>.vercel.app/api/sync-articles
```

## Données externes

Flux RSS de médias, canaux Telegram publics, GDELT (ACLED a été retiré le 26/10/2026 : ses conditions d'usage ne
permettent pas une exploitation commerciale), Banque mondiale
(indicateurs des fiches pays), TeleGeography (câbles sous-marins, CC BY-SA 3.0), USGS, NASA EONET, GDACS,
CelesTrak, Esri (fond de carte). Aucune donnée d'un dossier Investigation n'est dans le dépôt public.
