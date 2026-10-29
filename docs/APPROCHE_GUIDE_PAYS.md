# Guide : ajouter un pays, modifier un champ

Public : qui produit ou relit les fichiers pays (ChatGPT, éditeur) et qui les intègre (développeur). Règles de fond et structure : `docs/APPROCHE_SCHEMA_V1.md`. Paquet complet : `docs/APPROCHE_CONTRAT_V1.md`.

## A. Ajouter un pays

1. **Vérifier que le pays existe sur le site** : sa fiche d'ancien modèle existe (`lib/countries/<slug>.ts`) avec son `slug`, son `iso3` et sa zone. Le `slug`, le `zoneSlug` et le `countryCode` du fichier doivent correspondre.
2. **Partir de l'exemple** : copier `docs/exemples/APPROCHE_EXEMPLE_COMPLET.json` (tous les modules) ou `APPROCHE_EXEMPLE.json` (minimal) vers `data/approche/<ISO3>.json`, puis remplacer **toute** la substance : identité, sources, observations. Aucun mot de l'exemple ne doit survivre (`exemple`, `fictif`, `example.org`).
3. **Renseigner d'abord les sources** (`sources[]`) : adresse exacte, organisme, date de consultation, licence lue, `reuse`. Un fait sans source n'existe pas.
4. **Renseigner les observations** : une valeur, son unité, sa période, son périmètre, sa méthode, ses sources. Valeur inconnue : `value: null` et `status: "pending"`.
5. **Ajouter les modules disponibles** (défense, enjeux, vulnérabilités, cartes…). Un module absent est masqué : ne pas l'inventer.
6. **Valider** :

   ```bash
   npm run approche:validate -- data/approche/<ISO3>.json
   npm run approche:validate -- data/approche/<ISO3>.json --check-links
   ```

   Corriger jusqu'à la ligne `✔ … valide`. Traiter les avertissements `!` (licence `unknown`, lien injoignable).
7. **Enregistrer le pays** (développeur) : dans `lib/approche/repository.ts`, importer le fichier et l'ajouter au registre (`import MLI from "@/data/approche/MLI.json";` puis `MLI: { curated: MLI },`). Les séries automatiques facultatives (`<ISO3>.worldbank.json`, `<ISO3>.eurostat.json`) s'ajoutent à la même entrée. Aucun composant, aucune page à écrire.
8. **Vérifier le rendu en local** : `npm run dev`, puis `/zones/<zoneSlug>/approche/pays/<slug>` et les cinq autres onglets (`/relations`, `/economy`, `/defense`, `/issues`, `/outlook`). Redémarrer le serveur local après l'ajout d'un pays (les routes sont pré-rendues).
9. **Construire** : `npm run build` (le garde-fou de médias et le pré-rendu des six onglets doivent passer) puis `npm test`-équivalent : `npx tsx --test tests/approche.test.ts`.
10. **Preview Vercel** : pousser une branche de développement (jamais `main`), ouvrir l'adresse de la preview (la connexion du site est requise), contrôler les six onglets, les volets de sources, les cartes.
11. **Revue** : relecture éditoriale des valeurs et des sources par le responsable. Les valeurs `pending` restent `pending`.
12. **Publication** : `publication: "published"` et fusion **uniquement après accord exprès** du responsable éditorial. Un pays `draft` ou `review` n'est jamais affiché publiquement.

## B. Modifier un champ existant

1. Ouvrir le fichier concerné (`data/approche/<ISO3>.json`). Les fichiers `<ISO3>.worldbank.json` et `<ISO3>.eurostat.json` sont **produits par script** (`scripts/sync-approche-*.ts`) : ne pas les éditer à la main, relancer le script.
2. **Corriger la valeur et sa source ensemble** : si la valeur change, la période, la méthode, la date de vérification et la source changent avec elle. Ne jamais ajuster un chiffre pour l'embellir, ni changer le millésime.
3. Un fait **historiquement distinct** se sépare en deux observations (exemple : `institutions.eec_founding` 1958 et `institutions.eu_membership` 1993), chacune avec sa source.
4. Si la phrase de synthèse en dépend, corriger aussi l'affirmation (`claims[]`) et son `caveats`.
5. `npm run approche:validate -- data/approche/<ISO3>.json`, puis `npx tsx --test tests/approche.test.ts`.
6. Mettre à jour `lastCheckedAt`, `verifiedAt` de la valeur et, si besoin, `collectedAt`.
7. Même chemin que l'ajout : build, preview, revue, publication sur accord.

## C. Lire les erreurs

| Message | Cause | Correction |
|---|---|---|
| `champ obligatoire absent` | Un champ obligatoire manque (voir `APPROCHE_CHAMPS_V1.md`). | L'ajouter. |
| `adresse invalide (adresse complète https://… attendue)` | URL sans protocole ou incomplète. | Adresse exacte de la page. |
| `date AAAA-MM-JJ attendue` | Date au mauvais format. | `2026-01-15`. |
| `au moins 1 élément(s) attendu(s)` | Liste obligatoire vide (souvent `sourceIds`). | Ajouter une source. |
| `valeur non reconnue, attendu : …` | Valeur hors énumération. | Une des valeurs listées. |
| `source inconnue « X »` | `sourceIds` cite une source absente de `sources[]`. | Ajouter la source ou corriger l'identifiant. |
| `source exclue (licence) : X` | SIPRI ou un relais de SIPRI, ou `commercial_license_required`. | Retirer la source et la donnée ; utiliser une source publique nationale. |
| `« verified » sans date de vérification` | Observation vérifiée sans `verifiedAt`. | Renseigner la date, ou passer en `pending`. |
| `contenu de démonstration dans une fiche réelle` | `demo: true` dans un fichier réel. | Retirer l'élément ou le sourcer. |
| `observation inconnue « clé » (observationKey)` | Un chiffre clé renvoie à une clé absente. | Créer l'observation ou corriger la clé. |
| `image inconnue « id »` / `image sans licence confirmée` | Image absente du catalogue ou licence non confirmée. | Corriger `imageId` ; retirer l'image tant que la licence commerciale n'est pas établie. |
| `parent inconnu « id »` | Organigramme : `parentId` mène nulle part. | Corriger `parentId`. |
| `identifiant « id » déjà utilisé` | Deux éléments éditoriaux ont le même `id`. | Rendre l'identifiant unique. |

## D. Règles d'écriture pour ChatGPT

- **Ne jamais inventer** : pas de chiffre, de date, de nom, d'URL ou de licence « vraisemblable ». En cas de doute : `pending`, `reuse: "unknown"`.
- **Une source par fait, la plus primaire possible** (texte officiel, organisme statistique national, institution internationale), avec son adresse exacte.
- **Deux mesures d'un même sujet** : deux observations avec le même `topic`, jamais une moyenne ni un choix silencieux.
- **Analyses** (atouts, défis, enjeux, scénarios) : attribuées, datées, sourcées ; **aucun score, aucune probabilité chiffrée**.
- **Opérations militaires** : toujours datées ; une opération close porte `status: "Clôturée"`.
- **Cartes** : un point est un fait public daté, jamais une « zone d'influence » ni une coordonnée sensible.
- **Rendre le fichier sans toucher au code** : ChatGPT produit le JSON ; l'intégration est faite par le développeur.
