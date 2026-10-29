# ÉQUINOXE HQ — Rapport d'audit préalable

**Date : 17 octobre 2026**
**Réponse à :** `EQUINOXE_HQ_CAHIER_DES_CHARGES.md` et `EQUINOXE_HQ_COMPLEMENT_VISUEL_VIDEO.md`
**Statut : audit en lecture seule, aucune implémentation**

Aucun fichier du dépôt, aucune branche, aucune base et aucun service n'ont été modifiés pendant l'audit.

**Point non vérifié :** je n'ai pas pu lire Supabase depuis mon environnement (la connexion ne répond pas). Les chiffres de consommation réelle de la table `ai_usage` restent donc **à vérifier**. Les estimations ci-dessous reposent sur le code et sur les montants annoncés dans le cahier des charges.

---

## Verdict

- **Faisable : oui, et dans le budget.** La V1 coûterait **moins de 5 €/mois** de frais nouveaux. Le régime normal tourne autour de **10 à 15 €/mois**.
- **Une condition** : le travail de développement de Giuseppe et Ethan doit passer par l'abonnement Claude Pro (mode assisté ou « routines »), et non par l'API facturée. Sinon le scénario intensif dépasse les 40 €.
- **Changer l'ordre de la roadmap** : d'abord le registre des tâches, ensuite l'habillage pixel-art. Le visuel ne vaut que si les statuts sont vrais.

---

## Réponses aux 7 questions du complément

### 1. Compréhension du visuel et de la disposition

Oui :
- Un bureau pixel-art vu de dessus, ambiance sombre, avec une salle commune et sa table au centre.
- **Haut gauche** : Nicolas (CEO), Giuseppe (UI/UX, front-end), Elisa (finances, développement commercial).
- **Bas gauche** : Ethan (CTO, systèmes IA).
- **Bas, vers le centre** : Adrian (Indopacifique), puis Belinda (Amérique du Sud et latine).
- **Bas droite** : Alexander (Europe).
- **Droite au milieu** : Leïla (Moyen-Orient).
- **Haut droite** : Gabriel (Afrique).
- Un clic sur un agent ouvre son panneau latéral. Une barre « Demander au HQ… » permet de choisir explicitement l'agent destinataire. Les bulles ne se déclenchent que sur des événements réels.
- Sur mobile, on passe en vue liste, avec les mêmes panneaux.

### 2. Technologie de la scène animée

Recommandation : **DOM + CSS avec des sprites**, sans moteur de jeu.

- Chaque agent est un vrai `<button>` posé sur une image de fond (le plan). Les animations d'attente se font en CSS `steps()`.
- Résultat : un poids quasi nul, la navigation clavier et l'accessibilité « gratuites », et la réduction des animations via `prefers-reduced-motion`.
- **PixiJS** ne se justifierait que pour des déplacements avec recherche de chemin. **Phaser** est surdimensionné pour ce besoin.
- **Sprites** : les packs **Kenney (licence CC0)**, ou un dessin maison inspiré du plan PowerPoint. C'est le coût caché du projet : du temps, pas de l'argent.

### 3. Composants et pipelines réutilisables sans risque

Voir la section B.

### 4. Relier avatar, mission, job, statut, historique et facture IA

Une seule source de vérité :
- Une table `hq.tasks` et un journal `hq.task_events` où l'on ne fait qu'ajouter des lignes.
- Le statut d'un agent est **calculé** à partir de ses tâches, jamais stocké à la main.
- Chaque appel IA enregistre `task_id`, `agent_id` et l'identifiant du run GitHub (`run_id`) dans `ai_usage`.
- Si le worker ne donne plus signe de vie depuis plus de N minutes, l'agent passe en `état inconnu`, au lieu d'inventer une activité.

### 5. Limites du pilotage de Claude Code via Pro

Voir la section D.

### 6. Coûts

Voir la section E.

### 7. Simplifications et améliorations

Voir la section G.

---

## A. Faisabilité

| Fonction | Verdict |
|---|---|
| Bureau visuel, clics, panneaux, mobile | **Immédiat** |
| Statuts réels des jobs existants (synthèses par zone → analyste) | **Immédiat** : l'API GitHub Actions donne en file / en cours / terminé / échec, et `sync_status` donne la santé des collecteurs |
| Tâches, historique, approbations | **Immédiat** : le modèle brouillon → publication existe déjà (`situation_reports`) |
| Elisa : dépenses estimées par tâche et par agent | **Immédiat** (après ajout de colonnes à `ai_usage`) |
| Elisa : rapprochement avec la facture réelle | **Conditionnel** : il faut l'Admin API d'Anthropic (clé très privilégiée, disponibilité à vérifier pour ce compte), sinon une saisie manuelle |
| Analystes : 5W, géolocalisation, croisement, brouillons | **Faisable**, en lisant les synthèses déjà produites (`zone_briefs`) plutôt que les articles bruts, pour ne pas doublonner les traitements |
| Cycle « Approche » à 15 jours | **À construire** : il n'existe que comme texte dans `data/country-profiles/europe.json`, rien ne l'automatise |
| Giuseppe/Ethan pilotant Claude Code | **Conditionnel** (voir D) |
| Telegram | **Faisable** et gratuit pour les canaux publics (architecture déjà proposée : `t.me/s/<canal>`) |
| X/Twitter | **Non réaliste** dans le budget : l'API X est payante. Tarif actuel non vérifié |
| « Conversation » libre avec 9 agents | Faisable, mais c'est **le premier poste de dérive des coûts** : à encadrer |

---

## B. Audit de l'existant

### Réutilisable tel quel

- **`lib/aiBudget.ts`** : module pur et testé (`tests/ai-budget.test.ts`). Il contient les seuils 3/5/8 $, la décision de générer ou non (`shouldGenerateBriefs`), la politique de recherche web et la rotation des zones.
- **`lib/aiUsage.ts`** : journal des appels (`recordUsage`) et contrôle avant traitement (`checkBudget`).
- **Table `sync_status`** : santé de chaque collecteur (dernier succès, dernière erreur, volume).
- **`situation_reports` et `/admin/situation`** : le circuit brouillon → relecture → publication.
- **`brief_revisions`** : un trigger archive l'historique des synthèses, c'est une base d'audit.
- **Les workflows GitHub Actions** : `sync-briefs`, `zone-synthesis`, `situation-report`, `country-indicators`, `backfill-images`.
- **Une correspondance naturelle zone → analyste** :

| Zone (code) | Analyste |
|---|---|
| `afrique` | Gabriel |
| `europe` | Alexander |
| `moyen-orient` | Leïla |
| `indopacifique` | Adrian |
| `amerique-du-sud` | Belinda |

Les statuts de ces cinq agents peuvent donc devenir réels **sans aucun appel IA**, en lisant les exécutions des workflows existants.

### Traitements IA actuels (vérifiés dans le code)

| Tâche | Où | Cadence (UTC) | Modèle |
|---|---|---|---|
| `sync-briefs` | Route Vercel appelée par GitHub Actions, une zone à la fois | Tous les jours 06:05 | `claude-haiku-4-5-20251001` (fixe) |
| `zone-synthesis` | Script dans GitHub Actions | Mardi à samedi 07:05, une zone par jour | Variable `SYNTHESIS_MODEL`, Haiku 4.5 par défaut |
| `situation-report` | Script dans GitHub Actions | Lundi 05:10 | Variable `SYNTHESIS_MODEL`, Haiku 4.5 par défaut |

La recherche web est désactivée par défaut (plafond mensuel à 0).

Les crons Vercel (`vercel.json`) n'appellent pas l'IA : `sync-acled` 03:00, `sync-gdelt` 04:00, `sync-articles` 05:00, `sync-vessels` 07:00.

### Problèmes trouvés

1. **Le dépôt `sahel-conflict-map` est public.** Le code du HQ (prompts, permissions, circuits d'admin) doit aller dans un **dépôt privé séparé**.
2. **Tarif unique pour tous les modèles** : `estimateCostUsd` applique le prix de Haiku 4.5 à tout appel. Dès que le HQ utilisera Sonnet, les coûts estimés seront faux. Il faut une table de prix par modèle.
3. **`checkBudget` laisse passer en cas de panne** : si la table `ai_usage` est illisible, le traitement continue sans plafond. C'est acceptable pour le site public, pas pour de nouveaux agents, qui devront se bloquer dans ce cas.
4. **Les seuils applicatifs ne sont pas un vrai plafond** : ils ne voient que les appels qui passent par ce code. Il faut une **limite de dépense fixée dans la Console Anthropic** (fonction à vérifier), avec une clé séparée pour le HQ.
5. **L'authentification admin actuelle** (`lib/adminAuth.ts`) repose sur un mot de passe unique. Le cookie est une empreinte fixe, valable tant que le mot de passe ne change pas, et il n'y a pas de MFA. Elle est insuffisante pour le HQ.
6. **Le site tourne sur le plan Vercel Hobby, réservé à un usage non commercial.** La phase 2 d'Elisa (B2B, abonnements) imposerait le plan Pro (20 $/mois, soit la moitié de l'enveloppe).
7. **Les routes Vercel sont limitées à 60 s dans le code** (`maxDuration = 60`), alors que Hobby autorise maintenant 300 s. On peut remonter cette limite si besoin.
8. **`sync-articles` est appelé deux fois** : par le cron Vercel à 05:00 et par GitHub Actions à 06:05. C'est sans gravité.
9. **Les crons planifiés d'un dépôt public sont désactivés par GitHub après 60 jours sans activité.**
10. **Heure d'hiver le 25 octobre 2026** : les crons sont en UTC. Il faut décider si l'on veut une heure UTC fixe ou une heure de Paris fixe. Dans le second cas : `sync-briefs` `5 6` → `5 7`, `zone-synthesis` `5 7` → `5 8`, `situation-report` `10 5` → `10 6`.

### Contraintes des plateformes (documentation consultée le 17/10/2026)

| Service | Contrainte |
|---|---|
| Vercel Hobby | Gratuit, **usage non commercial uniquement**, fonctions jusqu'à 300 s, 4 h CPU actif/mois, 1 M d'invocations/mois |
| GitHub Actions | Illimité en dépôt **public** ; **2 000 min/mois** gratuites en dépôt privé ; jobs jusqu'à 6 h |
| Supabase gratuit | 500 Mo de base, 2 projets actifs, pause après 1 semaine d'inactivité, Realtime 2 M messages/mois, MFA de base incluse ; Pro à partir de 25 $/mois |

---

## C. Architecture recommandée

```
[Navigateur / mobile] ──► equinoxe-hq (Next.js, projet Vercel séparé, dépôt PRIVÉ)
   │  Supabase Auth + MFA TOTP, un seul compte autorisé,
   │  + protection Vercel Authentication des déploiements
   │  lit : vues hq.* (RLS)   écrit : routes serveur uniquement
   ▼
[Supabase existant, schéma « hq » séparé, RLS stricte]
   hq.agents  hq.tasks  hq.task_events  hq.approvals  hq.messages
   + ai_usage (colonnes task_id, agent_id, run_id ajoutées)
   ▲                       │ Realtime (gratuit) → bulles et statuts en direct
   │                       ▼
[Exécuteur = GitHub Actions du dépôt HQ]
   - déclenché par workflow_dispatch à la création d'une tâche (pas de sondage permanent)
   - + un passage horaire « balayeur » : tâches orphelines, alertes de budget
   - prise de tâche atomique (SKIP LOCKED), essais plafonnés, délai max, bouton d'arrêt
   ▼
[Alertes] bot Telegram (gratuit) : erreurs, seuils, « validation requise »
   → fonctionnent même si la page est fermée
```

### Justifications

- **Exécuteur GitHub Actions** : aucun VPS, et les jobs longs sont possibles (jusqu'à 6 h par job). Les 2 000 minutes gratuites du dépôt privé suffisent en mode événementiel. Un sondage toutes les 15 minutes les épuiserait (environ 2 900 min/mois).
- **Pas de fonctions serverless pour les tâches longues** : Vercel ne sert qu'à l'interface et aux routes courtes (création de tâche, approbation).
- **Supabase** : on garde le même projet, avec un schéma `hq` séparé et des politiques RLS strictes. Un second projet est possible sur l'offre gratuite (2 projets actifs maximum), mais il doublerait la maintenance.
- **File de tâches** : une table Postgres avec prise atomique (`FOR UPDATE SKIP LOCKED`), ou l'extension Supabase Queues (pgmq) si elle est disponible sur le projet.
- **Statuts temps réel** : Supabase Realtime sur `hq.task_events`, avec repli sur un rafraîchissement toutes les 30 s.
- **Validations** : une tâche « livrable prêt » crée une ligne `hq.approvals` ; seule l'approbation de Nicolas déclenche la publication.
- **Mode mobile** : vue liste des agents, mêmes panneaux, alertes et validations rapides via Telegram.
- **Nouvelles dépendances** : aucune en V1, en dehors des sprites.

### Sécurité

- Accès strictement privé : Supabase Auth avec MFA TOTP, liste blanche d'un seul compte, plus Vercel Authentication sur les déploiements.
- Secrets uniquement dans les secrets GitHub/Vercel, jamais dans les prompts, le navigateur, l'historique ou les journaux.
- Contenus web, RSS, Telegram et X traités comme **non fiables** : les analystes n'ont aucun outil à effet de bord, leurs productions sont des brouillons.
- Code : branche dédiée, protection de `main`, PR obligatoire, aperçu Vercel, **jamais de fusion automatique**.
- Journal d'audit de toutes les actions, bouton d'arrêt d'urgence, annulation des missions, limites de budget et de durée.
- Politique de conservation et de suppression des conversations et documents à définir (la base gratuite est limitée à 500 Mo).

---

## D. Claude Code et l'abonnement Pro

Sources : documentation officielle code.claude.com (pages *GitHub Actions*, *Legal and compliance*, *Claude Code in the cloud*, *Routines*), consultée le 17/10/2026.

| Voie | Facturation | Verdict |
|---|---|---|
| **Mode assisté** : Giuseppe/Ethan rédigent le brief, Nicolas lance Claude Code, le HQ suit la branche, la PR et la CI via l'API GitHub | Abonnement Pro | **Recommandé en V1** : fiable, conforme, 0 € de plus |
| **Routines avec déclencheur API** : le HQ envoie un POST `/fire` avec un jeton propre à la routine, ce qui lance une session cloud | Abonnement Pro (consomme le quota) | **Possible en V3.** Officiel, ouvert à Pro. Mais en « research preview » (en-tête bêta, peut changer), 30 déclenchements par heure et par routine, et la session agit **sans demander d'approbation**. Le texte envoyé est traité comme une donnée non fiable, sauf si le prompt de la routine l'autorise |
| **GitHub Action `claude-code-action`** avec `CLAUDE_CODE_OAUTH_TOKEN` (créé par `claude setup-token`) | Abonnement Pro | Possible, mais le jeton est long-lived et lié au compte : à protéger soigneusement |
| **Agent SDK dans un worker maison** | **Clé API facturée** | Les identifiants Pro sont interdits ici (doc *Legal and compliance*) |

### Limites à connaître

- Les quotas Pro sont **partagés** entre l'usage interactif et l'automatisation (sessions cloud, routines, GitHub Action avec jeton OAuth).
- La documentation précise que les limites Pro supposent un « usage individuel ordinaire ». Les volumes exacts ne sont pas publiés.
- Il n'existe **aucune API gratuite et illimitée** pour piloter Claude Code.
- Un site web ne peut pas piloter une session Claude Code interactive ; il peut seulement déclencher une routine (voie officielle) ou un workflow GitHub.
- Garde-fous indispensables : protection de la branche `main`, PR obligatoire, tests et aperçu Vercel, **décision de fusion et de déploiement réservée à Nicolas**.

---

## E. Estimation financière

### Hypothèses

- Taux de change : **1 $ ≈ 0,86 €** (à vérifier au moment de la décision).
- TVA : selon le statut de facturation, **+20 % possible** sur l'API.
- Tarifs officiels Anthropic consultés le 17/10/2026 :

| Modèle | Entrée | Sortie |
|---|---|---|
| Haiku 4.5 (modèle actuel du site) | 1 $/M jetons | 5 $/M jetons |
| **Haiku 5.5** | **0,10 $/M** | **0,50 $/M** (10 fois moins cher) |
| Sonnet 5.5 | 2 $/M | 10 $/M |
| Recherche web | 10 $ pour 1 000 recherches | |
| API Batch | −50 % sur entrée et sortie | |

### Charges fixes nouvelles : 0 €

Vercel Hobby, Supabase gratuit, GitHub Actions dans les quotas, bot Telegram, Supabase Auth avec MFA.

### Coûts IA nouveaux par scénario (par mois)

| Poste | Faible | Normal | Intensif |
|---|---|---|---|
| Extraction 5W/géoloc (Haiku 5.5, par lots) | 3 000 articles → 0,5 $ | 6 000 → 1,8 $ | 15 000 → 4,5 $ |
| Synthèses 96 h (Sonnet 5.5, 40k entrée / 3k sortie) | 10 → 1,1 $ | 40 → 4,4 $ | 150 → 16,5 $ |
| Analyses premium (80k / 6k + 5 recherches) | 2 → 0,5 $ | 8 → 2,2 $ | 20 → 5,4 $ |
| Conversations avec les agents | 30 msg → 0,1 $ | 150 → 1,5 $ | 500 → 5 $ |
| Recherche web supplémentaire | 0 | 100 → 1 $ | 400 → 4 $ |
| Code Giuseppe/Ethan | Pro (0 €) | Pro (0 €) | Pro (0 €) ; **via API : +10 à 15 $** |
| **Total nouveau** | **≈ 2,2 $ ≈ 2 €** | **≈ 11 $ ≈ 9,5 €** | **≈ 35 $ ≈ 30 €** (≈ 43 € via API → hors budget) |

### Dépenses existantes et dépenses supplémentaires

| Poste | Montant mensuel |
|---|---|
| Traitements IA existants (annoncés, à confronter à la Console) | 2,5 à 4 $ ; **0,3 à 0,5 $** possible en passant à Haiku 5.5, sous réserve d'un test de qualité |
| Infrastructure existante (Vercel Hobby, Supabase gratuit, GitHub Actions) | 0 € |
| Nouveaux services HQ (régime normal) | ≈ 9,5 € |
| Abonnement Claude Pro (présenté à part) | ≈ 18 à 22 € TTC, voir la facture |
| **Coût total réaliste du dispositif, Pro compris** | **≈ 25 à 35 €/mois** en régime normal |

### Coûts cachés possibles

- Vercel Pro (20 $/mois) si Équinoxe devient commercial.
- Supabase Pro (25 $/mois) au-delà de 500 Mo de base.
- Dépassement du quota Pro, qui ralentit l'usage personnel de Claude Code.
- L'API X.
- La TVA.

### Règles pour rester sous 30–40 €/mois

- Un plafond par agent et par mission.
- Un plafond Console sur la clé du HQ, autour de 25 $.
- Blocage si le budget ne peut pas être vérifié.
- 2 essais maximum et un délai maximum par tâche.
- Batch pour tout ce qui n'est pas urgent.
- Règles classiques avant tout appel IA (déduplication, seuils, cache).
- Aucune IA dans les animations.

**40 € est un plafond, pas une cible** : l'application doit échouer proprement plutôt que lancer une boucle de dépenses.

---

## F. Délais estimés

En jours de travail avec Claude Code, relecture de Nicolas comprise :

| Phase | Contenu | Durée |
|---|---|---|
| P0 | Prototype visuel avec données simulées (plan, sprites, panneaux, mobile) | 3 à 5 j |
| V1 | Auth + MFA, schéma `hq`, tâches et événements, statuts réels des jobs existants en lecture seule, alertes Telegram | 8 à 12 j |
| V2 | Elisa phase 1 (les données existent déjà) + prix par modèle | 3 à 5 j |
| V3 | Analystes : Gabriel d'abord, puis les quatre autres ; brouillons et approbation | 6 à 10 j |
| V4 | Giuseppe/Ethan en mode assisté, puis via les routines | 4 à 6 j |
| V5 | Salle de réunion, missions transversales | 5 à 8 j |
| **Total** | | **≈ 30 à 45 jours** |

Maintenance ensuite : 2 à 4 h/mois.

### Dépendances

- V1 dépend de l'auth et du schéma `hq` ; tout le reste dépend de V1.
- V3 dépend du suivi des coûts par modèle (V2), sinon les coûts Sonnet sont mal estimés.
- V4 (routines) dépend de la protection de `main` et du circuit PR/aperçu.

---

## G. Recommandations critiques

1. **Inverser la roadmap** : le registre des tâches avant l'immersion. Le prototype visuel P0 peut se faire tôt et sans risque, mais sans être branché à rien.
2. **Tester Haiku 5.5 sur les pipelines actuels.** C'est le gain le plus rapide de tout le projet.
3. **Une clé Anthropic dédiée au HQ, avec une limite de dépense dans la Console.** C'est le seul vrai plafond.
4. **Un dépôt privé pour le HQ.**
5. **Pas de « chat libre » au départ** : chaque message crée ou commente une tâche. Les conversations sont plus courtes, traçables et chiffrées.
6. **Un seul moteur et 9 configurations** (prompt, outils, budget, périmètre) dans `hq.agents`, plutôt que 9 agents distincts.
7. **Le bot Telegram** pour les alertes et la validation rapide sur mobile.
8. **Abandonner l'API X**, prioriser Telegram (déjà conçu).
9. **Fonctions inutiles pour l'instant** : la marche animée vers la salle de réunion, la vue isométrique, et le module devis/factures d'Elisa phase 2 (un outil de facturation existant fera mieux, avec moins de risques légaux et fiscaux).
10. **Aucun pourcentage de progression inventé** : afficher des étapes horodatées.

### Roadmap révisée proposée

1. **P0** : prototype visuel avec données simulées.
2. **V1** : registre des tâches, auth, statuts réels des jobs existants, alertes.
3. **V2** : budget d'Elisa et prix par modèle.
4. **V3** : nouvelles missions des analystes, brouillons, approbation.
5. **V4** : flux Giuseppe/Ethan avec Claude Code.
6. **V5** : salle de réunion et missions transversales.

---

## H. Conclusion

- **Faisabilité** : oui.
- **Architecture** : Next.js privé sur un projet Vercel séparé, schéma `hq` dans le Supabase existant, exécuteur GitHub Actions déclenché à la demande, alertes Telegram, Claude Code en mode assisté.
- **V1 concrète** : le bureau visuel, des statuts réels dérivés des 5 workflows existants, des tâches avec leur historique, des approbations, le budget d'Elisa, et **aucun nouvel appel IA**.
- **Coût réaliste** : de 2 à 10 €/mois nouveaux en régime normal, abonnement Pro compté à part.

**Rien n'a été implémenté.** Prochaine étape proposée : le **prototype visuel P0** (page locale avec données simulées, dans un dossier séparé, sans toucher au site public), sous réserve de l'autorisation explicite de Nicolas.

### Points restant à vérifier

- Consommation réelle dans `ai_usage` et facturation réelle dans la Console Anthropic.
- Disponibilité d'une limite de dépense par clé ou par espace de travail dans la Console.
- Accès à l'Admin API d'Anthropic pour le rapprochement des factures.
- Tarif actuel de l'API X.
- Taux de change et TVA applicables.
- Qualité de Haiku 5.5 sur les synthèses actuelles (test comparatif).
