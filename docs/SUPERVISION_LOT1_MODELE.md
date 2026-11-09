# Supervision V1 — Lot 1 : modèle métier et sécurité

Branche `supervision-lot1-modele` (depuis `main`, indépendante du prototype du Lot 2). Rédigé le 9 novembre 2026.
**Rien n'est relié au site actif** : aucune route, aucun écran, aucune écriture dans les tables existantes. Le SQL ne s'exécute que sur la **préproduction** (`equinoxe-staging`).

## Règles implémentées (toutes validées par Nicolas)

| Règle | Où |
|---|---|
| Intelligence : 1 active + 3 en pause, 1 création/refonte majeure par 30 jours glissants | `lib/supervision/core/policy.ts` |
| Pro : 3 actives + 10 en pause, 3 créations/refontes par 30 jours (D7) | idem |
| Plus : sans Supervision ; Enterprise : sur devis (valeurs provisoires, sans plafond de crédits) ; fondateur : sans plafond de crédits | idem |
| Modification **majeure** si : zone principale remplacée, objectif changé, **volume > +30 %**, **coût IA > +30 %** (« plus de », 30 % exactement est mineur) | `majorChange.ts` |
| Comparaison **cumulative** au périmètre de référence (dernière création ou refonte majeure), pas à la version précédente | `majorChange.ts`, `sv_scope_versions` |
| Ajouter un pays, une source ou un mot-clé n'est pas automatiquement majeur : seul l'impact compte | `majorChange.ts` |
| Estimation insuffisamment fiable : **signalée avant activation** ; un élargissement non chiffrable est traité comme majeur (sinon il contournerait le quota) | `majorChange.ts` (`warnings`, `unreliableExpansionIsMajor`) |
| Un crédit n'est consommé qu'à l'**activation effective** : réservé (« pending »), confirmé après l'initialisation, **rendu** en cas d'échec ou d'expiration | `sv_activate`, `sv_confirm_operation`, `sv_cancel_operation` |
| Modules, filtres d'affichage, pause, réactivation inchangée : **aucun crédit** | `sv_pause`, `sv_resume` |
| Plafonds IA applicables dans tous les cas (10 % du prix, en dollars, avec marge de sécurité) | `budget.ts`, `sv_reserve_ai_budget` |
| **Tous les seuils sont configurables côté serveur** (variable `SUPERVISION_POLICY_JSON`, validée, sans toucher au code) | `policy.ts` |

## Ce que la base garantit (atomicité)

Chaque fonction qui décide d'un quota prend d'abord un **verrou consultatif par compte** : deux demandes simultanées sont traitées l'une après l'autre. Constat de l'audit du Lot 0 corrigé : l'ancien budget IA lisait la dépense puis écrivait, ce qui laissait deux traitements dépasser ensemble le plafond. Ici, vérification et réservation sont dans la même transaction. Les opérations sont **idempotentes** (une clé = une opération : double clic et relance ne consomment rien de plus).

## Sécurité

- Tables et fonctions préfixées `sv_` : **aucune table existante n'est touchée**, y compris les anciennes tables du prototype de Supervision.
- RLS activé **sans politique**, droits retirés à `anon` et `authenticated`, fonctions réservées à la clé de service.
- Isolation entre comptes : chaque fonction prend le propriétaire en argument et ne touche jamais aux lignes d'un autre ; testée A/B (lecture, activation, pause, modification, crédits, idempotence).
- Décision du 09/11/2026 : pas de Supabase Auth ni de Realtime dans cette étape ; la sécurité sera réévaluée à l'intégration du backend.
- Une version de périmètre est **immuable** (déclencheur en base).

## Écarts avec le cahier des charges (à valider)

1. **Noms de tables** préfixés `sv_` (`sv_supervisions`, `sv_scope_versions`, `sv_operation_ledger`, `sv_entitlements`, `sv_grace_periods`, `sv_ai_ledger`, `sv_audit_log`) : les noms du cahier sont « indicatifs », et ceux de l'ancien prototype existent déjà en production avec une autre structure. Le préfixe évite toute collision et toute modification de la production.
2. **Réserve de service** du budget IA : 20 % du plafond, valeur provisoire (le cahier ne la chiffre pas).
3. **Brouillons** : bornés à 3 par compte (valeur configurable), pour éviter l'accumulation.
4. **Enterprise** : 10 actives et 30 en pause par défaut, sans plafond de crédits : valeurs provisoires en attendant les modalités.
5. Les **périodes de grâce** (résiliation, rétrogradation à 90 jours) ont leur table et la lecture seule est déjà résolue (`resolveAccess`), mais la logique complète (choix des Supervisions conservées, purge, notifications) reste au **Lot 6**.
6. La classification majeure/mineure est faite par le **serveur** (TypeScript) et transmise à la base ; la base applique le résultat atomiquement mais ne recalcule pas la classification.

## Vérifier

- `npx tsx --test tests/supervision-core.test.ts` : règles pures (17 tests).
- `npm run test:staging` : tests d'intégration contre la préproduction (14 tests : concurrence, idempotence, fenêtre glissante, isolation A/B, budget, sécurité). Il refuse de tourner si la base n'est pas la préproduction.
