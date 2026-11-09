# Supervision V1 — Lot 0 : audit du dépôt et plan

Rédigé le 8 novembre 2026, en réponse au cahier des charges « SUPERVISION V1 » (version 0.9 du 8/11/2026).
**Aucune modification du site, de la base ni des branches n'a été faite pour cet audit** (lecture seule du dépôt, `main` et `supervision-v1`).
Ce qui n'a pas pu être vérifié est signalé « à vérifier ».

---

## 1. Ce qu'il faut savoir avant tout

1. **Une première Supervision existe déjà**, sur la branche `supervision-v1` (50 fichiers, ≈ 5 650 lignes, 7 fichiers de tests). Elle a été construite pour le brief du 27/10 : *une* veille, quatre onglets fixes (Vue générale, Flux, Analyses, Paramètres). C'est un moteur de veille solide, mais **ce n'est pas le tableau de bord modulaire du nouveau cahier des charges** (pas de grille, pas de modules, pas d'assistant, pas d'alertes).
2. **`main` a avancé sans elle** : 89 commits de `main` ne sont pas dans la branche, 20 commits de la branche ne sont pas dans `main`. Une fusion à blanc donne **4 conflits**, tous sur les comptes (`lib/adminAuth.ts`, `app/api/admin/login/route.ts`, `scripts/create-account.ts`, `app/mon-espace/supervision/page.tsx`), parce que `main` contient désormais la version définitive des comptes individuels.
3. **Les comptes individuels, le cloisonnement des dossiers et le partage sont déjà dans `main`** (tables `accounts`, `account_codes`, partage par pseudo + IDcode ; dossiers d'un compte préfixés par son identifiant). La rubrique Supervision est **réservée à l'offre `owner`** (`lib/espaceAccess.ts`) : l'ouvrir à Intelligence et Pro est une ligne à changer.
4. **Il n'existe ni paiement, ni e-mail sortant, ni PDF serveur, ni Realtime** dans le dépôt. L'offre d'un compte est une simple colonne `accounts.tier` posée à la main.
5. **Il n'y a qu'une seule base Supabase, celle de la production.** Le critère « aucun test sur la production » du cahier des charges n'est donc pas tenable tel quel sans environnement de test à part (voir risque R1).

**Recommandation de méthode** : ne pas fusionner `supervision-v1`. Partir d'une branche neuve depuis `main` et y **porter** les fichiers propres à la Supervision (`lib/supervision/*`, `components/supervision/*`, `app/api/supervision/*`, ses tests et son SQL), en laissant de côté tout ce qui touche aux comptes (déjà dans `main`). Détail en section 5.

---

## 2. Ce qui existe et est réutilisable

### Sur `main`
| Élément | Où | Usage pour la Supervision |
|---|---|---|
| Comptes, session signée (HMAC), mots de passe scrypt, offres `owner/plus/intelligence/pro/enterprise` | `lib/accounts.ts`, `lib/accountStore.ts`, `supabase/add-accounts.sql` | Identité et offre de chaque propriétaire |
| Accès par rubrique | `lib/espaceAccess.ts`, `components/espace/SectionGate.tsx` | Ouvrir Supervision à Intelligence/Pro |
| Cloisonnement des dossiers, partage entre comptes | `lib/accountScope.ts`, `lib/accountCodes.ts`, `supabase/add-sharing.sql` | Modèle de cloisonnement déjà éprouvé (côté serveur) |
| Événements analysés (lieu, pays, thème, importance, confiance, revendication, sources, tags pays ISO 3) | table `zone_briefs` | Source d'événements **mutualisés** la plus riche |
| Événements GDELT | table `conflict_events` | Source complémentaire |
| Journal des coûts IA et modes de dégradation | `lib/aiBudget.ts`, table `ai_usage` | Base du budget par abonnement |
| Chaîne de planification : cron Vercel → workflow GitHub Actions | `vercel.json`, `.github/workflows/*.yml`, `/api/cron/dispatch/*` | Collecte et synthèses des veilles |
| Cartes : Cesium (globe), Leaflet (cartes à plat) | `components/equinoxe/Globe3D.tsx`, `components/supervision/SupervisionMap.tsx` (branche) | Module Carte |
| Éditeur de notes (Tiptap), export d'image | dépendances `@tiptap/*`, `html-to-image` | Module Notes ; export visuel |
| Géocodage, géométrie des pays | `lib/geocode.ts`, `lib/worldGeo.ts` | Placement des événements |

### Sur `supervision-v1` (à porter)
| Élément | Fichiers | État |
|---|---|---|
| Modèle d'une veille (zone cercle/pays, critères, sources, horaire, validation) | `lib/supervision/model.ts` | Prêt, testé |
| Collecte partagée (RSS d'Équinoxe ou de l'utilisateur, Telegram public, GDELT, synthèses, Google Actualités) : téléchargée **une fois** pour toutes les veilles | `collect.ts`, `sources.ts`, `gnews.ts` | Prêt, testé (voir limite : pas de planification) |
| Rattachement veille ↔ publication avec score et raison, écartées conservées (verdict `drop`) | `match.ts`, `curate.ts`, tables `supervision_matches` | Prêt, testé |
| Tri éditorial par IA (Haiku 4.5) : pertinence, titre FR, résumé, thèmes, lieu | `curate.ts` | Prêt |
| Géolocalisation avec précision (`exact/ville/zone/aucune`) | `geo.ts`, `nearby.ts` | Prêt : respecte déjà « pas de coordonnées inventées » |
| Synthèses quotidienne/hebdomadaire sourcées, historisées | `synthesis.ts`, table `supervision_reports` | Prêt, déclenché par bouton |
| Retours utilisateur (pertinent / non / doublon / mauvais lieu) | table `supervision_feedback` | Prêt |
| Journal des passages (durée, volumes, erreurs), relançables sans doublon | table `supervision_runs` | Prêt |
| Plafond IA par compte (10 % du prix) avec réservation avant appel | `budget.ts`, colonnes ajoutées à `ai_usage` | **Non atomique** (voir R2) |
| Composants d'interface : bandeau, carte, carte d'article, rapport | `components/supervision/*` | Réutilisables comme **contenu** des futurs modules |

**Ce qui est déjà en base de production** (SQL exécuté en octobre, d'après mes notes) : tables `supervisions`, `supervision_items`, `supervision_events`, `supervision_matches`, `supervision_reports`, `supervision_feedback`, `supervision_runs`, colonnes `ai_usage.owner_id/supervision_id/status`, et une colonne `investigation_cloud.owner_id` devenue inutile (le cloisonnement de `main` passe par un préfixe de clé). Une veille de test « Nord Bénin » y existe. **À vérifier** en interrogeant la base avant la première migration.

---

## 3. Écarts avec le cahier des charges

| Exigence | État actuel | Écart |
|---|---|---|
| F01-F04 Un tableau, modules, grille magnétique, rendu compact/standard/développé | **Absent.** Onglets fixes. Aucune bibliothèque de grille dans `package.json` | Tout le Lot 2 |
| F05 Filtres globaux facultatifs | Filtres locaux (période, source, localisés seulement) dans la vue détail | À restructurer |
| F06 Module préconfiguré depuis la requête | La requête produit zone, critères et sources ; pas de modules | À créer |
| F07, F09 Mise à jour et synthèses planifiées | Collecte et synthèse **sur bouton** ; script `supervision-collect.ts` prêt mais **aucun workflow GitHub** | Workflow + choix quotidien/hebdomadaire |
| F08 Alertes et e-mails | **Absent** (un bandeau local seulement). Aucun fournisseur d'e-mail | Lot 5 |
| F10 Assistant analytique | **Absent** | Lot 5 |
| F11 Notes, historique, PDF | Historique des synthèses : oui. Notes : éditeur existant dans Investigation. **PDF : aucune bibliothèque** | PDF à choisir (voir D6) |
| F12 Transparence (statut, priorité, fraîcheur) | Raison, pertinence, note du juge, liste des écartées. **Pas de statut de vérification** ni de groupes d'indépendance | Voir R5 |
| F13 Budget IA partagé avec réserve | Plafond par compte, réservation puis règlement. **Pas de réserve de service, réservation non atomique** | Voir R2 |
| F14 Pause | Statut `paused` existe ; la collecte ne traite que les veilles actives | À compléter (notifications, assistant) |
| F15 Limites 1+3 / 3+10 | Limite d'actives par offre : oui. **Limite de pauses : non.** Plafond de 10 veilles par compte | À remplacer par les vraies limites |
| F16-F17 Versions de périmètre, crédit de création/refonte sur 30 jours glissants | **Absent** | Lot 1 (tables de versions et de journal d'opérations, fonction atomique) |
| F18-F19 Résiliation et rétrogradation à 90 jours | **Absent**, et il n'existe aucune source d'abonnement | Lot 6 ; dépend de D1 |
| F20 Prix 19,99 € / 49,99 € | Constantes dans `model.ts` (+ une offre « Plus » à 7,99 € que le cahier ne mentionne pas) | Voir D2 |

---

## 4. Risques et incompatibilités

**R1 — Pas d'environnement de test séparé (critique).** Une seule base Supabase (production). Les migrations du Lot 1 et les tests de concurrence y toucheraient les données réelles. Options : (a) second projet Supabase gratuit servant de « préproduction » (à vérifier : plan actuel et limites) ; (b) tout tester sur la production avec des tables neuves, un compte de test et aucun e-mail réel. Je recommande (a).

**R2 — Le budget IA n'est pas atomique.** `reserveBudget` lit la dépense, décide, puis écrit une ligne : deux traitements simultanés peuvent lire le même solde et dépasser ensemble le plafond. Le cahier exige l'inverse. Correction : une fonction SQL unique (verrou par compte) qui vérifie et réserve dans la même transaction, avec test de concurrence.

**R3 — Sécurité : RLS et authentification.** Les tables ont la RLS activée **sans politique** (la clé publique n'a accès à rien) ; l'isolation entre comptes repose sur le code serveur, qui filtre sur `owner_id` avec la clé de service. C'est sûr tant que **toute** route filtre, mais ce n'est pas une RLS « utilisateur A ne lit pas B » au sens du cahier. Cause de fond : le site a sa propre session (cookie signé), pas **Supabase Auth**, donc `auth.uid()` n'existe pas. Conséquences : (a) la RLS par utilisateur et Supabase Realtime sécurisé ne sont pas utilisables tels quels ; (b) pour les obtenir il faudrait émettre un jeton JWT compatible Supabase pour chaque compte (travail faisable, non trivial, à vérifier avec le plan Supabase). **Proposition V1** : isolation côté serveur + tests automatiques A/B sur chaque route, actualisation par **interrogation périodique** (polling) ; RLS par utilisateur et Realtime en phase suivante.

**R4 — Le moteur ne tourne pas tout seul.** Les crons Vercel et GitHub `schedule` ne s'exécutent que depuis `main`. Sur une branche, la collecte se lance à la main. Les analyses longues doivent rester dans GitHub Actions (comme aujourd'hui), pas dans une requête Vercel.

**R5 — Statuts de vérification.** Aujourd'hui rien ne les calcule, et le cahier interdit de déduire une confirmation du nombre de reprises. Il faut une règle explicite de « groupe d'indépendance » (reprises d'agence, même média, même source primaire). Proposition V1 prudente : `signalement` par défaut ; `corroboré` seulement si au moins deux groupes indépendants ; `confirmé` jamais automatique (source primaire désignée ou geste de l'analyste) ; `contesté` seulement si une contradiction est détectée. Voir D4.

**R6 — Coût IA.** Le plafond actuel est 10 % du prix : **≈ 2 € / mois (Intelligence)** et **≈ 5 € / mois (Pro)**. Mes estimations du 27/10 (3 à 8 $ par mois et par veille avec X, ≈ 1 $ pour la version sobre sans X) rendent le plafond Intelligence **serré** dès qu'on ajoute assistant, synthèses et analyses exceptionnelles. Il ne faut rien conclure avant les mesures du Lot 4 sur trois profils (calme, active, dense). La double comptabilité dollars/euros (`AI_USD_PER_EUR`) est à garder.

**R7 — Vercel Hobby.** Mon accord de principe (27/10) : Hobby jusqu'au lancement officiel ; l'usage commercial exige Pro. Les limites de durée des fonctions rendent le traitement long impossible côté Vercel : tout passe par GitHub Actions. Le temps de calcul GitHub (privé : forfait gratuit limité) est à surveiller quand le nombre de veilles grandit (à vérifier).

**R8 — Moteur de grille.** `gridstack` (v14.1.0, MIT) et `react-grid-layout` (v2.3.0, MIT, pair `react >= 16.3`) existent. **Aucun des deux n'est vérifié avec React 19.2 / Next 16 dans ce dépôt** : la preuve de concept du Lot 2 doit trancher (insertion depuis un bandeau, redimensionnement, sérialisation, mobile). `react-grid-layout` est d'emblée plus naturel en React ; GridStack impose un pont React (documenté comme plus récent). À décider après essai.

**R9 — Deux anciens engagements à rendre cohérents avec le cahier.** (a) La règle du 27/10 « *une seule* enquête par compte » est remplacée par 1 active + 3 en pause (Intelligence) et 3 + 10 (Pro). (b) La rubrique est aujourd'hui réservée au fondateur : tant qu'elle l'est, personne d'autre ne peut tester.

**R10 — Les offres du code diffèrent du cahier.** Le code connaît cinq offres (owner, plus, intelligence, pro, enterprise). Le cahier n'en traite que deux. À trancher (D2).

---

## 5. Migrations nécessaires (proposition)

Réutiliser l'existant, **ajouter** le reste (aucune suppression) :

| Table du cahier | Décision proposée |
|---|---|
| `supervisions` | **Existe.** Ajouter `current_scope_version_id`, `activated_at`, `paused_at` ; étendre les états (`initializing`, `error`, `read_only_grace`, `pending_deletion`, `deleted`) |
| `supervision_scope_versions` | **Nouvelle** (versions immuables de la requête) ; y migrer `zone/criteria/sources` actuels |
| `supervision_dashboards`, `supervision_widgets` | **Nouvelles** |
| `source_publications` | **Existe** sous le nom `supervision_items` (mutualisée) ; ajouter la provenance et le groupe d'indépendance |
| `events` commune | **À décider (D5)** : consolider dans `supervision_events` (par veille, existant) ou créer une table commune ; V1 : réutiliser `zone_briefs` et `conflict_events` en lecture |
| `event_evidence`, `supervision_event_matches` | `supervision_matches` existe (score, raison, verdict) ; ajouter les preuves et le groupe d'indépendance |
| `supervision_analyses` | `supervision_reports` existe ; ajouter fenêtre de données, version de périmètre, identifiants cités |
| `supervision_messages`, `supervision_notes`, `supervision_alert_rules`, `supervision_alerts`, `notification_deliveries` | **Nouvelles** |
| `subscription_entitlements`, `grace_periods` | **Nouvelles** ; remplies **à la main** tant qu'il n'y a pas de paiement (D1) |
| `supervision_operation_ledger`, `ai_usage_ledger`, `audit_log` | **Nouvelles** ; `ai_usage` existant sert de base au registre IA, avec une fonction SQL atomique (R2) |

Ne pas réexécuter tel quel `supabase/add-supervision.sql` de la branche : il recrée `accounts` (déjà gérée par `main`) et ajoute `investigation_cloud.owner_id` (obsolète). Écrire de nouvelles migrations, numérotées, propres à la Supervision.

---

## 6. Plan par lots, avec recette

**Lot 1 — Modèle métier et sécurité.** Branche neuve depuis `main`. Migrations (section 5), fonctions SQL atomiques (crédit de création 30 jours glissants, réservation de budget, limites actives/pauses), droits par offre, journal d'opérations, tests de concurrence et d'isolement A/B sur chaque route. *Recette* : critères 1 à 4 et 18 du cahier (création idempotente, double-clic, deux créations concurrentes, limites, isolation).

**Lot 2 — Éditeur isolé (premier prototype demandé).** Page de test sans base ni collecte, données **entièrement fictives** : bibliothèque de modules en bandeau, grille, glisser-déposer, redimensionnement avec trois rendus (compact / standard / développé) sans appel IA, mode édition/consultation, sauvegarde locale, vue mobile, deux modules du même type avec filtres différents. Essai comparatif des deux moteurs de grille (R8). *Recette* : critères 7 à 9 du cahier.

**Lot 3 — Données existantes.** Modules Carte, Flux, Chronologie, Statistiques sur `zone_briefs`, `conflict_events` et publications ; dédoublonnage par événement ; états « données insuffisantes », « obsolète ».

**Lot 4 — Moteur de veilles.** Port de la collecte et du tri, workflow GitHub planifié, budget atomique, synthèses quotidiennes/hebdomadaires, analyses exceptionnelles encadrées, mesures de coût sur trois profils.

**Lot 5 — Assistant et restitution.** Assistant (recherche ciblée, sources réelles uniquement), notes, historique, export PDF, alertes, e-mails dédoublonnés (fournisseur à choisir, D3).

**Lot 6 — Cycle de vie et homologation.** Pause, reprise, résiliation et rétrogradation à 90 jours, mobile, sauvegarde, observabilité, tests de sécurité.

Règle du cahier conservée : démo de chaque lot sur branche/environnement isolé, retour de Nicolas, fusion sur son feu vert.

---

## 7. Décisions à prendre (ordre d'urgence)

- **D0 — Environnement de test.** Second projet Supabase gratuit pour la préproduction, ou tests sur la production avec garde-fous (R1) ? Bloque le Lot 1.
- **D1 — Source de vérité de l'abonnement.** V1 : colonne et table remplies à la main par toi ; paiement (Stripe ou autre) hors de la V1 ? Je ne crée aucun compte de paiement ni ne saisis de coordonnées bancaires.
- **D2 — Offres.** Garde-t-on « Plus » (7,99 €) et « Enterprise » dans le code ? Le cahier ne parle que d'Intelligence et Pro.
- **D3 — E-mail sortant.** Fournisseur et plafond d'envoi (Lot 5).
- **D4 — Statuts de vérification.** Valides-tu la règle prudente du R5 pour la V1 ?
- **D5 — Événement commun.** Réutiliser `zone_briefs`/`conflict_events` en lecture pour la V1, ou construire la table commune dès le Lot 1 ?
- **D6 — PDF.** Impression navigateur (gratuit, rapide) ou génération serveur (plus propre, une dépendance de plus) ?
- **D7 — Quota Pro de créations** (3 par 30 jours proposé) et définition mesurable d'un changement « majeur » (point ouvert 2 du cahier).
- **D8 — Réalité de la sécurité** : acceptes-tu « isolation serveur + tests A/B + polling » pour la V1, avec RLS par utilisateur et Realtime plus tard (R3) ?

---

## 8. Proposition pour la suite

1. Tu réponds aux décisions D0 à D2 (les seules qui bloquent le démarrage).
2. Je crée la branche neuve depuis `main` et je réalise le **prototype du Lot 2** : tableau fictif, grille, modules, trois rendus, mode édition/consultation, mobile, avec comparaison des deux moteurs de grille. Page isolée, aucune écriture en base, rien dans `main`.
3. Démo, retour, puis Lot 1.
