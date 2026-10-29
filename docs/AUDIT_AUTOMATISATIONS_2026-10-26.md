# Audit des automatisations Équinoxe (Vercel + GitHub) — 26 octobre 2026

Audit en lecture seule : rien n'a été modifié. Il repose sur le code, les workflows, `vercel.json`, une recherche
automatique de code mort et la suite de tests (307 tests, types et lint propres). **Non vérifié** : les journaux de
production et l'état de Supabase (injoignables depuis le poste de développement), les réglages Vercel, la date
d'expiration des jetons, ce que renvoie réellement ACLED aujourd'hui, le coût réel. Les passages ont été retracés
**sur le code**, pas rejoués en production.

## État d'avancement (mis à jour le 26/10/2026)

| Lot | Contenu | État |
|---|---|---|
| 1 | A1 secret absent refusé, A2 fichier d'e-mail retiré, A3 image GitHub épinglée, B7 exemple d'environnement | **Poussé** (`c44b5a2`) |
| 2 | C1 dépendances `globe.gl` / `three`, C2 fichiers et images orphelins, C3 fonctions mortes, C6 SQL ponctuels archivés, C7 note V1 archivée | Fait en local, build complet vérifié |
| 3 | B5 commentaires, B6 test de cohérence des horaires, README réécrit, journée type dans `docs/JOURNEE_TYPE.md` | Fait en local |
| 3 (non fait) | B4 garde-fou partagé entre workflows | **Volontairement laissé** : les trois variantes ne sont pas équivalentes (fenêtre horaire, jour, compteur de relances) et ne se testent pas hors de GitHub ; le risque de casser un garde de production dépasse le gain de clarté. Décrit dans `docs/JOURNEE_TYPE.md`. |
| 4 | ~~B1 ACLED~~ (**arrêté et supprimé le 26/10** : aucune ligne collectée, usage commercial non permis), B3 ordre du PSIT, C5 suivi navires et avions, A4 jeton GitHub, A5 limite de débit de la recherche, A6 requête de repli de l'accueil | **Décisions à prendre ensemble** : rien n'est modifié |

## 1. La journée type (heure d'hiver ; heures UTC, +1 h à Paris)

| UTC | Qui lance | Quoi | Dépend de |
|---|---|---|---|
| 04:00 | Vercel | Collecte ACLED (4 pays du Sahel) | identifiants ACLED |
| 05:00 | Vercel | Collecte GDELT (événements, repli des couleurs) | — |
| 06:00 | Vercel | Collecte des articles RSS + Telegram | — |
| 06:00 (lun, jeu) | Vercel → GitHub | Point de situation (brouillons, Opus) | synthèses publiées **jusqu'à la veille** |
| 07:00 | Vercel → GitHub | « Synthèses du jour » : recollecte, puis 3 lots de 5 par zone | collecte, API Anthropic |
| 09:00 | Vercel → GitHub | Synthèse de zone (une par zone, seulement si nouvelles synthèses) | synthèses du matin |
| 12:00 | Vercel → GitHub | « Synthèses du jour » léger : recollecte, 1 lot de 5 par zone | — |
| secours | GitHub | `10 6` (PSIT), `5 7`, `5 9`, `5 12` : ne partent que si le lancement Vercel n'a pas eu lieu | garde « déjà lancé » |

Marge de Vercel : chaque horaire part dans les 59 minutes qui suivent. Écarts minimaux conservés entre étapes
dépendantes : au moins 1 h. Le groupe de concurrence de `sync-briefs` empêche deux passages simultanés.

## 2. Trouvailles, par priorité

### A. Sécurité et fiabilité

| # | Gravité | Constat | Correction proposée |
|---|---|---|---|
| A1 | **Importante (latente)** | 7 routes (`sync-acled`, `sync-gdelt`, `sync-articles`, `sync-briefs`, `sync-vessels`, `revalidate`, `cron/dispatch`) comparent l'en-tête à `Bearer ${process.env.CRON_SECRET}`. Si `CRON_SECRET` n'est pas défini, l'en-tête `Bearer undefined` passe : n'importe qui pourrait lancer des synthèses payantes. En production le secret est défini, donc le risque est latent. | Une seule fonction `isAuthorizedCron()` qui **refuse** si le secret est absent, comparaison à temps constant, un test. 7 fichiers touchés. |
| A2 | Moyenne | `scratch-ucdp-email.txt` (racine) est **suivi par git** : brouillon d'e-mail avec l'adresse personnelle d'un chercheur d'Uppsala, dans un dépôt public. | Supprimer le fichier. Le purger de l'historique est possible, mais pas indispensable. |
| A3 | Moyenne | Les 5 workflows utilisent `ubuntu-latest`, qui bascule vers Ubuntu 26 (avis affiché à chaque exécution). Un changement d'image peut casser `curl`, `gh` ou Node sans qu'on ait rien touché. | Épingler `ubuntu-24.04` (une ligne par workflow), changer volontairement plus tard. |
| A4 | Moyenne | Les lancements Vercel utilisent un jeton GitHub (`GITHUB_DISPATCH_TOKEN`). S'il expire, les crons échouent et on retombe sur les planifications GitHub, qui partent avec 4 à 8 h de retard. | Noter la date d'expiration ; faire alerter Ethan (GH-watch) si un lancement manque. |
| A5 | Faible | `/api/search` est publique, sans limite de débit (cache de 60 s, 4 requêtes Supabase par recherche non cachée). | Ajouter un plafond léger si on constate des abus. |
| A6 | Faible | L'accueil lance une requête sur 90 jours d'événements (`computeCountryRiskFromEvents`) à chaque régénération, alors qu'elle ne sert que de repli quand moins de 5 pays sont couverts par les analystes. | Ne l'exécuter que si nécessaire. |

### B. Clarté et dérive des automatisations

| # | Constat | Proposition |
|---|---|---|
| B1 | La collecte **ACLED ne couvre que Mali, Burkina Faso, Niger, Tchad** (`SAHEL_COUNTRIES`, héritage du projet d'origine) alors que le site couvre 5 zones. Elle n'enregistre pas son état (GDELT le fait). Elle nourrit encore l'ancien onglet carte de ces pays et le repli des couleurs. | Décision : garder (Sahel uniquement), étendre, ou arrêter. D'abord vérifier qu'elle renvoie encore des données. |
| B2 | La collecte des articles tourne trois fois par jour (6 h UTC seule, 1ʳᵉ étape de 7 h, 1ʳᵉ étape de 12 h). Elle est dédupliquée donc sans surcoût, mais le cron de 6 h ne sert plus qu'à rafraîchir la liste d'articles du site avant les synthèses. | Garder ou supprimer, sans enjeu financier. |
| B3 | Le point de situation (6 h UTC) part **avant** les synthèses du jour (7 h) : un jour de retard sur l'actualité (cas du Brésil). | Décaler le PSIT après les synthèses (par exemple 8 h UTC, et la synthèse de zone à 9 h UTC reste ensuite). Décision de ta part. |
| B4 | Trois garde-fous « déjà lancé » écrits à la main, avec trois variantes (jour, fenêtre horaire, compteur). | Un seul script partagé par les workflows. |
| B5 | Plusieurs commentaires sont périmés (« Remplace le cron Vercel de sync-briefs… une exécution par jour… »). | Réécrire les en-têtes, et mettre la journée type ci-dessus dans `docs/`. |
| B6 | Les horaires sont écrits en UTC à 4 endroits (`vercel.json`, workflows, commentaires, tests) : deux changements manuels par an. | Un seul tableau de référence + un test de cohérence. |
| B7 | `.env.local.example` liste 6 variables sur environ 25 utilisées (manquent `ANTHROPIC_API_KEY`, `TELEGRAM_*`, `GITHUB_DISPATCH_TOKEN`, `ADMIN_*`, modèles, `AI_*`, `AISSTREAM`, `OPENSKY`). | Compléter, sans valeurs. |
| B8 | GitHub ne garde qu'**un** lancement en attente par groupe de concurrence : si plusieurs s'empilent, le plus ancien est annulé sans bruit. Rare, mais explique des exécutions « annulées ». | Aucune action ; à connaître. |

### C. Code mort ou dormant

| # | Constat |
|---|---|
| C1 | **Dépendances inutiles :** `globe.gl` (38 Mo), `three` (25 Mo), `@types/three`, jamais importées depuis le passage à Cesium. Elles alourdissent chaque `npm ci` (3 workflows) et chaque build. (`@tiptap/pm` est une dépendance requise de Tiptap : à garder.) |
| C2 | **Fichiers jamais importés :** `components/equinoxe/RiskLegend.tsx`, `ZoneCategoryIcon.tsx`, `lib/zoneImages.ts` (et l'image `public/equinoxe/europe-actualite.png`, 1,4 Mo, qu'il est seul à citer), `lib/zoneHubContent.ts` (cité seulement par un composant lui-même orphelin). |
| C3 | **Fonctions sans usage :** `isConfidenceLabel`, `useCanvasCards` / `useCanvasLinks` (Investigation), `telegramConfigured`, le type `SyncStatus`, `getZoneImage`, `getZoneHubContent`. `zoneForWeekday` (`lib/aiBudget.ts`) et son test sont les restes de l'ancienne rotation de zones par jour, remplacée par le traitement quotidien de toutes les zones. |
| C4 | Une centaine d'`export` inutiles (types et constantes utilisés seulement dans leur fichier) : cosmétique, à ne traiter que par un outil automatique. |
| C5 | **Suivi navires et avions** (`TRACKING_ENABLED = false` depuis le 18/10) : routes `/api/sync-vessels` et `/api/tracking/aircraft`, `lib/syncVessels`, `lib/opensky`, bibliothèque `ws`, image `logo-tracking.png` (1,1 Mo). Dormant par décision : à garder ou archiver dans une branche. |
| C6 | `supabase/` : 27 fichiers SQL dont des scripts ponctuels (`seed-*`, `seed-test-data`, `cleanup-manual-zones`). | Les ranger dans `supabase/archive/` avec l'ordre d'exécution. |
| C7 | `docs/sources-briefs-v1.md` : document de la version 1, à relire ou archiver. |

## 3. Plan proposé, par lots (chaque lot est un commit annulable)

1. **Lot 1, sécurité et CI (environ 1 h) :** A1, A2, A3, B7.
2. **Lot 2, nettoyage (1 à 2 h) :** C1, C2, C3, C6, vérification par la suite de tests et le build.
3. **Lot 3, clarté (1 à 2 h) :** B4, B5, B6 ; journée type dans `docs/`.
4. **Lot 4, décisions à prendre ensemble :** B1 (ACLED), B3 (ordre du PSIT), C5 (suivi navires et avions), A4.

## 4. Limites de cet audit

- Aucun passage n'a été relancé en production : retracés sur le code et les tests seulement.
- Pas de lecture des journaux Vercel ni de la base : les fréquences d'échec ne sont pas mesurées.
- Le build de l'accueil ne peut pas s'exécuter hors ligne (appels externes) : le contrôle de build final se fait sur Vercel.
- Les minutes GitHub Actions ne posent pas de problème dans un dépôt public ; dans un dépôt privé, l'usage estimé
  (environ 30 minutes par jour) resterait sous le plafond gratuit de 2 000 minutes par mois.
