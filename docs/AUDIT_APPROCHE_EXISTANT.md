# Audit de l'existant — Approche / fiches pays (PR 0, aucune modification du site)

Date : 29 octobre 2026 · Branche : `approche-v1` (partie de `main`) · Référence : `EQUINOXE_APPROCHE_SPEC_IMPLEMENTATION_V1.md` et les 7 pages de `APPROCHE - FRANCE.pdf` (maquette).

## 1. Ce qui existe déjà

### Routes
| Route | Fichier | Rôle |
|---|---|---|
| `/zones/[slug]/approche` | `app/zones/[slug]/[tab]/page.tsx` (onglet « approche » de la zone) | Page d'Approche d'une zone : texte, catégories, liste des pays (`components/zone-approche/ZoneApprochePage.tsx`, contenu `lib/zoneApprocheContent.ts`) |
| `/zones/[slug]/approche/pays/[country]` | `app/zones/[slug]/approche/pays/[country]/page.tsx` | Fiche pays (une seule page longue, 11 sections en ancres) |

La fiche pays est rendue côté serveur (`revalidate = 3600`) par `components/country-profile/CountryProfilePage.tsx` (493 lignes). Sections actuelles : En bref, Repères, Politique & institutions, Sécurité, Économie & ressources, Infrastructures stratégiques, Société & démographie, Environnement, Acteurs clés, Événements récents liés, Sources. **Pas d'onglets, pas d'URL par onglet, pas de tiroir de provenance.**

### Données
- **Squelette d'identité** : un fichier TypeScript par pays dans `lib/countries/` (137 pays, `lib/countries/index.ts`).
- **Contenu** : un lot JSON par zone dans `data/country-profiles/` — aujourd'hui seulement `europe.json` (44 pays, 195 Ko). Fusionné au squelette par `lib/countryOverlays.ts` (les `null` du lot veulent dire « pas encore renseigné » ; l'identité vient toujours du dépôt).
- **Indicateurs chiffrés** : `data/country-profiles/indicators.json`, alimenté par `scripts/sync-country-indicators.ts` (Banque mondiale, sans clé) via le workflow GitHub `country-indicators.yml` (le 1er de chaque mois, commit automatique si une valeur change). Cinq indicateurs seulement : population, superficie, PIB, croissance, inflation. `lib/countryIndicators.ts` les formate (`Md USD`, année entre parenthèses).
- **Type** : `types/country.ts` (`CountryProfile`) : texte libre et chaînes ; sources sous la forme `CountrySource` (titre, éditeur, URL, type, fiabilité 1-5 « attribuée par l'analyste »), `CountryVerification` (notes de provenance par bloc).
- **Géographie** : `lib/countryGeoConfig.ts` (pays principal, voisins, villes par pays), `lib/worldGeo.ts` + `public/data/world-countries.geo.json` (contours monde, 180 pays), cartes Leaflet (`CountryLeafletMap`, `ZoneCountryLeafletMap`) et SVG.
- **Drapeaux** : `lib/countryFlagIndex.ts` + `public/flags`.

### Fiche France actuelle
Dans `europe.json`, France est le squelette d'identité (capitale, régime, voisins, ports du Havre et de Marseille-Fos, quelques secteurs) avec `population`, `area`, `gdp`, `headOfState`, `headOfGovernment` à `null`. Le fichier TypeScript `lib/countries/france.ts` est marqué « DEMO / PLACEHOLDER ». **Il n'y a aucun chiffre sourcé à préserver.**

### Environnement technique
- Next.js 16.3, React 19, Supabase (côté serveur avec clé de service), Cesium 1.145, Leaflet 1.9 / react-leaflet 5, `fast-xml-parser`. **Pas de `zod`, pas de Vitest/Jest, pas de Playwright, pas de MapLibre.**
- Tests : `node:test` lancés par `npx tsx --test tests/*.test.ts` (425 tests au dernier passage). Tests existants proches : `country-indicators`, `country-overlays`, `country-flag-index`, `home-zones`.
- Thème : variables dans `app/globals.css` (`--bg-primary #070d17`, `--bg-panel #101c2c`, `--text-primary #f1f4f7`, **accent or `#c89b3c / #e0b44c`**, statuts vert/jaune/orange/rouge/bleu). Header commun : `components/equinoxe/Header.tsx`.
- Porte d'entrée (`proxy.ts`, `/acces`) : toutes les fiches exigent désormais une connexion ; le référencement public n'est plus un enjeu.
- Hébergement : Vercel Hobby (usage non commercial), pages construites par ISR.

## 2. Écarts entre le cahier des charges / la maquette et l'existant

| Sujet | Cahier des charges | Existant | Conséquence |
|---|---|---|---|
| Route | `/zones/[zone]/approche/[countrySlug]` « ou la route existante » | `/zones/[slug]/approche/pays/[country]` | **Garder la route existante** ; pas de migration |
| Navigation | 6 onglets par `?tab=` + « Sources » | une page longue à ancres | À construire : onglets sur la même route, état dans l'URL |
| Modèle de données | observations sourcées une à une, versionnées, statuts, licences | chaînes libres + liste de sources par pays | Nouveau modèle à introduire **à côté** de l'ancien, sans casser les 137 fiches |
| Stockage | tables Supabase suggérées | JSON dans le dépôt (versionné par git, déploiement automatique) | Voir §4 : démarrer en JSON + validation, Supabase plus tard si besoin |
| Validation | Zod | aucune | Ajouter `zod` (petite dépendance) ou valider à la main |
| Couleurs | bleu azur `#168CFF`, fonds `#061322…` | thème or/bleu nuit du site | **Suivre le thème du site** (la spec dit « à ajuster au design system existant ») |
| Pipeline de mise à jour | fetchers par source, diff, versions, coupe-circuit | un seul script mensuel (Banque mondiale) | Étendre ce script ; réutiliser le workflow, pas de nouveau service |
| Cartes | couches typées, Cesium pour le globe, MapLibre éventuel | Leaflet pour les cartes pays, Cesium pour le globe d'accueil | Réutiliser Leaflet pour les cartes embarquées (pas de MapLibre, pas de deuxième globe) |
| « Voir sur le globe » | centrer le globe existant | globe sur l'accueil seulement (pas sur la page pays) | Lien vers l'accueil avec zone/pays, à concevoir |
| « Voir les actualités » | filtrer par ISO | filtrage par zone ; `relatedEvents` sur la fiche | Filtre pays à construire à partir des synthèses et événements existants |
| « Créer une Supervision » | prérempli, quotas respectés | Supervision existe **seulement sur la branche `supervision-v1`**, pas dans `main` | **Bouton non activable tant que Supervision n'est pas fusionnée** |
| Examen visuel | PDF 7 pages | PNG reçues et lues | OK |

## 3. Ce qui est réutilisable tel quel
- Route, ISR, `getResolvedCountryProfile`, `CountryProfilePage` (à découper en onglets), `CountryFlag`, `CountrySourcesList`, `InfrastructureTable`, cartes Leaflet.
- Le workflow mensuel et le script Banque mondiale (à étendre à d'autres séries et à l'historique).
- `lib/worldGeo.ts` (contours pays), `lib/countryFlagIndex.ts`, la porte d'entrée, le Header.
- Le principe déjà en place « un `null` = pas renseigné, jamais inventé », parfaitement aligné avec la règle « jamais de valeur inventée ».

## 4. Plan de migration non destructif proposé

**Principe :** l'ancien `CountryProfile` et les 137 fiches continuent de fonctionner. Le nouveau modèle ne s'applique qu'aux pays « migrés » (France d'abord), détectés par la présence de données dans `data/approche/<iso3>/`.

1. **PR 1 — modèle, sources, France, onglet Vue d'ensemble**
   - `lib/approche/` : schémas (sources, observations, affirmations) avec validation ; registre de sources ; formatage `fr-FR`.
   - Données dans `data/approche/FRA/` (JSON versionné par git : avant/après, auteur, date), pas de table Supabase au départ : c'est cohérent avec le dépôt actuel (déploiement automatique, relecture par diff) et évite une base injoignable en local.
   - Tests qui échouent si une observation publiée n'a pas de source, si une URL est invalide, si une valeur n'a pas d'année.
   - Hero + onglets sur la route existante (`?tab=`), tiroir de provenance, Vue d'ensemble avec **seules les valeurs réellement sourcées** ; le reste affiche « donnée non disponible ».
   - Ancien rendu conservé pour les autres pays.
2. **PR 2 — relations internationales** (organisations, relations bilatérales sourcées, carte du réseau diplomatique seulement si l'annuaire est réutilisable).
3. **PR 3 — économie et ressources** (INSEE/Banque mondiale/RTE, graphiques réels, couches de carte documentées).
4. **PR 4 — défense et sécurité** (chiffres clés du ministère des Armées, opérations datées ; SIPRI exclu tant que la licence n'est pas obtenue).
5. **PR 5 — enjeux et perspectives** (dossiers éditoriaux, SWOT et scénarios qualitatifs, risques naturels Géorisques).
6. **PR 6 — automatisation et généralisation** (fetchers, diff, coupe-circuit de coût ; Russie et Ukraine comme pays d'essai).

## 5. Risques et points à trancher
1. **Sources et droits :** SIPRI (usage commercial soumis à autorisation), annuaire des ambassades (réutilisation à vérifier), images du ministère des Armées (licence). Les visuels de la maquette ne sont pas réutilisables.
2. **Données sensibles :** dirigeants, opérations en cours, effectifs : lus sur sites officiels, datés, et **relus par toi avant publication** (statut `draft` → `review` → `published`).
3. **Textes d'analyse (SWOT, scénarios, enjeux) :** je les rédige à partir de faits sourcés, marqués « analyse » et soumis à relecture ; aucun pourcentage de probabilité.
4. **Supervision :** le bouton « Créer une Supervision » dépend de la fusion de `supervision-v1`.
5. **Volume :** la fiche complète représente plusieurs jours de travail ; chaque PR est livrée et relue séparément.
6. **Environnement local :** Supabase est injoignable depuis la machine de développement ; le choix du JSON dans le dépôt évite cette dépendance pour la fiche.
7. **Dépendance nouvelle :** `zod` seulement (aucun framework de test ou de carte supplémentaire).

## 6. Éléments de la maquette à ne pas reprendre (rappel du §10 du cahier des charges)
Premier ministre « Michel Barnier », 380 000 / 200 000 militaires, « 11 opérations en cours » dont Barkhane, nombre d'ambassades/consulats (90/160/17), répartition « 67/9/24 » de l'électricité, dépendances 98/97/100 %, barres « influence » et « résilience », pourcentages 25/45/30 et 30/50/20, date « 12 mars 2025 », carte de risques colorée, niveaux de menace sans source officielle.

## 7. Décisions attendues avant la PR 1
1. Valider la route existante et le plan JSON dans le dépôt (plutôt que Supabase).
2. Accord pour ajouter la dépendance `zod`.
3. Confirmer que le thème actuel du site prime sur la palette azur de la maquette.
4. Dire si la fiche France doit rester sous la porte d'entrée (oui par défaut) et si elle peut être publiée sur `main` dès que la PR 1 est relue.
