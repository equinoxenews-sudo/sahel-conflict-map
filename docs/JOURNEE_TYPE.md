# La journée type d'Équinoxe — automatisations Vercel et GitHub

Mis à jour le 01/11/2026 (horaires cibles fixés en heure de Paris par Nicolas). Les heures sont en **UTC** dans le code ; la colonne « Paris » donne l'heure d'hiver
(UTC+1, du 25/10/2026 au 28/03/2027) puis, entre parenthèses, l'heure d'été (UTC+2).
Le plan Hobby de Vercel lance chaque cron **dans les 59 minutes** qui suivent l'heure indiquée : une étape
« à 07:00 » part entre 07:00 et 07:59 UTC.
Les horaires visés (heure de Paris) sont donc des **créneaux d'une heure** : 07 h 30 pour la rédaction du matin veut dire
« entre 07 h 00 et 07 h 59 ». L'ordre entre étapes dépendantes est tenu par les heures de départ, au moins une heure d'écart.

## Les horaires

| UTC | Paris | Lance | Quoi | Dépend de |
|---|---|---|---|---|
| 04:00 | 05 h (06 h) | Vercel | Collecte GDELT (événements, repli des couleurs du globe) | — |
| 06:00 | 07 h (08 h) | Vercel | Collecte des articles RSS et des messages Telegram | — |
| 06:00 | 07 h 30 (08 h 30) | Vercel, puis GitHub | **Rédaction des articles, passage du matin** : recollecte, puis jusqu'à 3 lots de 5 articles par zone | collecte, API Anthropic |
| 07:00 | 08 h (09 h) | Vercel, puis GitHub | **Synthèse de zone** (une par zone, seulement s'il y a de nouveaux articles) | articles du matin |
| 08:00, lundi et jeudi | 09 h (10 h) | Vercel, puis GitHub | **Point de situation** : brouillons des 5 zones (Opus) | articles du matin et synthèse de zone |
| 13:00 | 14 h (15 h) | Vercel, puis GitHub | **Rédaction des articles, passage de l'après-midi** : recollecte, 1 lot de 5 articles par zone, pas de synthèse de zone | — |
| 17:00, dimanche | 18 h (19 h) | Vercel, puis GitHub | **Veille OSINT et IA** : choix de 5 articles au plus parmi 4 sources, titre et résumé en français (Haiku, un seul appel, quelques centimes) | — |
| 1er du mois, 05:00 | 06 h (07 h) | GitHub | Indicateurs des fiches pays (Banque mondiale) | — |

**Secours GitHub.** Chaque workflow a aussi une planification propre (`10 8` pour le point de situation, `5 6`, `5 7`,
`5 13`). Elle ne sert que si le lancement par Vercel n'a pas eu lieu ; elle s'arrête d'elle-même si le lancement du
même passage a déjà réussi (pas de doublon ni de coût IA en trop). Les planifications GitHub partent parfois avec
plusieurs heures de retard : c'est pourquoi Vercel est le déclencheur principal.

## Comment un lancement se déroule

```
Vercel cron ──► /api/cron/dispatch/<nom> ──► GitHub : workflow_dispatch ──► workflow
                                                                              │
              « Rédaction des articles » : /api/sync-articles, puis /api/sync-briefs?zone=X (une zone à la fois)
              « Synthèse de zone »  : scripts/zone-synthesis.ts   (GitHub, appelle l'API Anthropic)
              « Point de situation »: scripts/situation-report.ts (GitHub, appelle l'API Anthropic, Opus)
```

Les noms reconnus par la route de réveil : `sync-briefs.yml`, `sync-briefs-apres-midi`, `zone-synthesis.yml`,
`situation-report.yml`, `veille-osint.yml` (liste dans `lib/syncPasses.ts`). La veille OSINT (dimanche) lit les flux de
`lib/veilleOsint.ts`, appelle le modèle une fois (`scripts/veille-osint.ts`) et écrit dans la table `veille_osint`.

## Ce qu'il faut savoir

- **Ordre :** rédaction du matin (06:00 UTC), puis synthèse de zone (07:00), puis point de situation (08:00, lundi et jeudi) : le point de situation voit donc les articles publiés le matin même.
- **Plafonds :** 3 lots de 5 articles par zone le matin, 1 lot l'après-midi (14 h) ; le mode budget du mois peut les réduire.
  Les articles en attente passent du plus récent au plus ancien et sont repris les jours suivants.
- **Lot mince :** un lot trop petit et trop récent est reporté sans appel au modèle.
- **Coûts :** chaque appel est noté dans la table `ai_usage` (durée, fin de génération, identifiant de requête, échecs
  et coupures compris), lisible dans Elisa. La Console Anthropic fait foi.
- **Erreurs :** une coupure par délai (170 s par appel) n'est pas retentée tout de suite ; une surcharge (529) ou une
  limite de débit passagère (429) l'est deux fois après une pause ; un plafond de dépenses ne l'est jamais.

## Relancer à la main

| Besoin | Où |
|---|---|
| Rejouer une zone | GitHub, Actions, « Rédaction des articles », Run workflow : choisir la zone et le passage (`matin` complet ou `apres-midi` léger). |
| Refaire les synthèses de zone | GitHub, Actions, « Synthèse de zone », Run workflow : zone, case « force ». |
| Refaire un point de situation | GitHub, Actions, « Point de situation (brouillons) », Run workflow, case « force ». Attention : la période commence où finit le dernier rapport, brouillon compris ; supprimer d'abord le brouillon à refaire (page `/admin/situation`). |
| Donner un sujet à une zone | ÉQUINOXE HQ : consigne du jour (prise en compte au prochain passage). |

## Changement d'heure (deux fois par an)

Au passage à l'heure d'hiver, tout décaler de **+1 h UTC** ; au retour de l'heure d'été (dimanche 28/03/2027),
ramener tout **1 h plus tôt**. À modifier ensemble :

1. `vercel.json` : les 7 horaires (la collecte ACLED a été arrêtée et supprimée le 26/10/2026).
2. Les lignes `cron:` des workflows `sync-briefs.yml` (2), `zone-synthesis.yml`, `situation-report.yml` et `veille-osint.yml`.
3. Le tableau ci-dessus et les commentaires d'en-tête des workflows.

Le test `tests/schedules.test.ts` échoue si un horaire de secours ne correspond plus à celui de Vercel ou si le
tableau de ce document n'a pas été mis à jour.
