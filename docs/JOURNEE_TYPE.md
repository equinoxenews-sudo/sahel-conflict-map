# La journée type d'Équinoxe — automatisations Vercel et GitHub

Mis à jour le 26/10/2026. Les heures sont en **UTC** dans le code ; la colonne « Paris » donne l'heure d'hiver
(UTC+1, du 25/10/2026 au 28/03/2027) puis, entre parenthèses, l'heure d'été (UTC+2).
Le plan Hobby de Vercel lance chaque cron **dans les 59 minutes** qui suivent l'heure indiquée : une étape
« à 07:00 » part entre 07:00 et 07:59 UTC.

## Les horaires

| UTC | Paris | Lance | Quoi | Dépend de |
|---|---|---|---|---|
| 05:00 | 06 h (07 h) | Vercel | Collecte GDELT (événements, repli des couleurs du globe) | — |
| 06:00 | 07 h (08 h) | Vercel | Collecte des articles RSS et des messages Telegram | — |
| 06:00, lundi et jeudi | 07 h (08 h) | Vercel, puis GitHub | **Point de situation** : brouillons des 5 zones (Opus) | synthèses publiées jusqu'à la veille |
| 07:00 | 08 h (09 h) | Vercel, puis GitHub | **Synthèses du jour, passage du matin** : recollecte, puis jusqu'à 3 lots de 5 articles par zone | collecte, API Anthropic |
| 09:00 | 10 h (11 h) | Vercel, puis GitHub | **Synthèse de zone** (une par zone, seulement s'il y a de nouvelles synthèses) | synthèses du matin |
| 12:00 | 13 h (14 h) | Vercel, puis GitHub | **Synthèses du jour, passage de l'après-midi** : recollecte, 1 lot de 5 articles par zone, pas de synthèse de zone | — |
| 1er du mois, 05:00 | 06 h (07 h) | GitHub | Indicateurs des fiches pays (Banque mondiale) | — |

**Secours GitHub.** Chaque workflow a aussi une planification propre (`10 6` pour le point de situation, `5 7`, `5 9`,
`5 12`). Elle ne sert que si le lancement par Vercel n'a pas eu lieu ; elle s'arrête d'elle-même si le lancement du
même passage a déjà réussi (pas de doublon ni de coût IA en trop). Les planifications GitHub partent parfois avec
plusieurs heures de retard : c'est pourquoi Vercel est le déclencheur principal.

## Comment un lancement se déroule

```
Vercel cron ──► /api/cron/dispatch/<nom> ──► GitHub : workflow_dispatch ──► workflow
                                                                              │
              « Synthèses du jour » : /api/sync-articles, puis /api/sync-briefs?zone=X (une zone à la fois)
              « Synthèse de zone »  : scripts/zone-synthesis.ts   (GitHub, appelle l'API Anthropic)
              « Point de situation »: scripts/situation-report.ts (GitHub, appelle l'API Anthropic, Opus)
```

Les noms reconnus par la route de réveil : `sync-briefs.yml`, `sync-briefs-apres-midi`, `zone-synthesis.yml`,
`situation-report.yml` (liste dans `lib/syncPasses.ts`).

## Ce qu'il faut savoir

- **Ordre :** le point de situation (07:00 UTC) part **avant** les synthèses du jour : il ne voit que ce qui était
  publié jusqu'à la veille. Un événement de la veille au soir n'y entre qu'au point suivant.
- **Plafonds :** 3 lots de 5 articles par zone le matin, 1 lot l'après-midi ; le mode budget du mois peut les réduire.
  Les articles en attente passent du plus récent au plus ancien et sont repris les jours suivants.
- **Lot mince :** un lot trop petit et trop récent est reporté sans appel au modèle.
- **Coûts :** chaque appel est noté dans la table `ai_usage` (durée, fin de génération, identifiant de requête, échecs
  et coupures compris), lisible dans Elisa. La Console Anthropic fait foi.
- **Erreurs :** une coupure par délai (170 s par appel) n'est pas retentée tout de suite ; une surcharge (529) ou une
  limite de débit passagère (429) l'est deux fois après une pause ; un plafond de dépenses ne l'est jamais.

## Relancer à la main

| Besoin | Où |
|---|---|
| Rejouer une zone | GitHub, Actions, « Synthèses du jour », Run workflow : choisir la zone et le passage (`matin` complet ou `apres-midi` léger). |
| Refaire les synthèses de zone | GitHub, Actions, « Synthèse de zone 9 h », Run workflow : zone, case « force ». |
| Refaire un point de situation | GitHub, Actions, « Point de situation (brouillons) », Run workflow, case « force ». Attention : la période commence où finit le dernier rapport, brouillon compris ; supprimer d'abord le brouillon à refaire (page `/admin/situation`). |
| Donner un sujet à une zone | ÉQUINOXE HQ : consigne du jour (prise en compte au prochain passage). |

## Changement d'heure (deux fois par an)

Au passage à l'heure d'hiver, tout décaler de **+1 h UTC** ; au retour de l'heure d'été (dimanche 28/03/2027),
ramener tout **1 h plus tôt**. À modifier ensemble :

1. `vercel.json` : les 6 horaires (la collecte ACLED a été arrêtée et supprimée le 26/10/2026).
2. Les lignes `cron:` des workflows `sync-briefs.yml` (2), `zone-synthesis.yml` et `situation-report.yml`.
3. Le tableau ci-dessus et les commentaires d'en-tête des workflows.

Le test `tests/schedules.test.ts` échoue si un horaire de secours ne correspond plus à celui de Vercel ou si le
tableau de ce document n'a pas été mis à jour.
