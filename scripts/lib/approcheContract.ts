// Construit les fichiers du contrat de données « Approche » à partir des schémas Zod réellement utilisés par l'interface :
// le JSON Schema, le dictionnaire champ par champ et le rapport des clés lues par les composants. Rien n'est écrit à la main :
// un test compare ces fichiers à ceux du dépôt, ils ne peuvent donc pas diverger du code.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CountryDataSchema } from "../../lib/approche/schema";
import { ELECTRICITY_KEYS, VALUE_ADDED_BRANCHES } from "../../lib/approche/keys";
import { SCHEMA_VERSION } from "../../lib/approche/modules";

type Node = Record<string, unknown> & { properties?: Record<string, Node>; items?: Node; anyOf?: Node[]; required?: string[]; type?: string | string[]; enum?: unknown[]; description?: string };

// Sens de chaque champ. Clés essayées dans l'ordre : chemin complet (tableaux notés []), « parent.champ », « champ ».
const DESCRIPTIONS: Record<string, string> = {
  sources: "Registre des sources : chaque affirmation, observation, relation ou élément de module cite au moins une source de cette liste.",
  observations: "Chiffres et faits localisés dans le temps : une valeur, son unité, sa période, son périmètre, sa méthode, ses sources.",
  claims: "Phrases factuelles ou analytiques, sourcées.",
  relationships: "Relations bilatérales ou avec des organisations, décrites par dimensions datées.",
  schemaVersion: "Version du schéma de fichier (1). Les évolutions sont additives : un fichier v1 reste lisible.",
  countryCode: "Code ISO 3166-1 alpha-3 du pays, en majuscules (ex. FRA).",
  slug: "Identifiant d'adresse du pays tel qu'il existe sur le site (ex. france).",
  zoneSlug: "Zone du site à laquelle appartient le pays (ex. europe).",
  name: "Nom d'usage du pays.",
  officialName: "Nom officiel complet.",
  publication: "Cycle de vie : draft, review, published, archived. Seul « published » est affiché publiquement.",
  lastCheckedAt: "Date du dernier contrôle de la fiche (AAAA-MM-JJ), même sans changement.",
  "sources.id": "Identifiant unique de la source ; repris par les champs sourceIds.",
  "sources.publisher": "Organisme qui publie la source.",
  "sources.title": "Intitulé exact de la page, de la série ou du rapport.",
  "sources.canonicalUrl": "Adresse exacte (jamais la page d'accueil de l'organisme).",
  "sources.apiUrl": "Adresse de l'interface de données utilisée, le cas échéant.",
  "sources.datasetId": "Code de la série ou du jeu de données (ex. NY.GDP.MKTP.CD).",
  "sources.datasetVersion": "Version ou date de mise à jour du jeu de données.",
  "sources.publishedAt": "Date de publication de la page, de la série ou du rapport.",
  "sources.accessedAt": "Date de consultation par l'équipe (AAAA-MM-JJ).",
  "sources.license": "Licence lue sur la source ; null si aucune n'a été trouvée.",
  "sources.licenseUrl": "Adresse des conditions d'utilisation ou de la licence.",
  "sources.reuse": "Droit de réutilisation : allowed (licence lue et compatible), citation_only (un fait cité avec attribution, sans reprendre texte, image ni marque), unknown (non vérifiée, signalée), commercial_license_required (exclue, ex. SIPRI).",
  "sources.methodNotes": "Ce qu'il faut savoir pour réutiliser la donnée : définition, révisions, limites.",
  "sources.originalPublisher": "Organisme producteur d'origine quand la source relaie les données d'un autre (agrégateur, plateforme). Les droits suivent la donnée d'origine : un producteur exclu (SIPRI) exclut la source.",
  "sources.language": "Langue de la source (fr, en…).",
  "observations.id": "Identifiant unique de l'observation.",
  "observations.countryCode": "Code ISO alpha-3 du pays (identique à celui du fichier).",
  "observations.key": "Clé stable de la donnée (ex. economy.gdp_nominal_usd). Les clés lues par l'interface sont listées dans APPROCHE_CHAMPS_UI.md ; une clé nouvelle est acceptée.",
  "observations.label": "Libellé d'affichage quand la clé ne suffit pas (ex. nom d'une branche économique).",
  "observations.topic": "Regroupe plusieurs mesures d'un même sujet (autre organisme, autre période) : elles sont affichées côte à côte, jamais moyennées.",
  "observations.value": "Valeur : nombre, texte ou booléen. null si inconnue (avec status pending).",
  "observations.unit": "Unité (habitants, USD, EUR, %, km², TWh…). null pour un texte.",
  "observations.currency": "Devise quand la valeur est monétaire et que l'unité ne la porte pas.",
  "observations.referencePeriod": "Période de la valeur (2025, 2025-Q4…). Jamais vide : aucun nombre sans année.",
  "observations.geographicScope": "Périmètre géographique exact (pays entier, métropole seule…).",
  "observations.methodology": "Définition et méthode : ce que mesure la valeur et comment.",
  "observations.sourceIds": "Identifiants des sources (au moins une).",
  "observations.collectedAt": "Date de collecte (AAAA-MM-JJ).",
  "observations.verifiedAt": "Date de vérification humaine ; obligatoire si status = verified.",
  "observations.validFrom": "Début de validité d'un fait (ex. prise de fonctions) quand la source le donne.",
  "observations.status": "verified (affichable), pending (jamais affichée comme un fait), stale, conflicting, rejected.",
  "observations.dataKind": "observed, calculated (avec calculationFormula), official_statement, editorial_analysis.",
  "observations.calculationFormula": "Formule des valeurs calculées, en clés d'observations (ex. a / b).",
  "observations.uncertainty": "Incertitude connue (révision, marge, estimation), affichée dans la provenance de la valeur.",
  "observations.history": "Valeurs des périodes précédentes, de la plus ancienne à la plus récente (courbes). Même périmètre que la valeur.",
  "claims.id": "Identifiant unique de l'affirmation.",
  "claims.statement": "Phrase factuelle ou analytique. Les affirmations vérifiées composent l'introduction de la fiche.",
  "claims.claimType": "fact, attributed_position, analysis, scenario.",
  "claims.sourceIds": "Sources de la phrase (au moins une).",
  "claims.validAsOf": "Date à laquelle la phrase est valable.",
  "claims.reviewer": "Relecteur, null tant que la phrase n'est pas relue.",
  "claims.status": "verified, pending, stale, contested.",
  "claims.caveats": "Réserves et précisions sur la portée de la phrase.",
  "relationships.targetCode": "Code ISO alpha-3 de l'acteur visé ; null pour une organisation.",
  "relationships.targetIso2": "Code ISO alpha-2 pour afficher le drapeau.",
  "relationships.targetName": "Nom de l'acteur visé (pays ou organisation).",
  "relationships.relationType": "treaty (engagement conventionnel), cooperation (partenariat documenté), tension (divergence documentée). Jamais un classement ami / rival.",
  "relationships.title": "Intitulé exact de l'accord, du traité ou du sujet de divergence.",
  "relationships.topics": "Domaines concernés (étiquettes).",
  "relationships.summary": "Résumé factuel avec dates de signature et d'entrée en vigueur.",
  "relationships.validFrom": "Début de validité de la relation (AAAA-MM-JJ).",
  "relationships.validTo": "Fin de validité, null si elle court encore.",
  "relationships.lastReviewedAt": "Date de la dernière relecture ; obligatoire si status = verified.",
  "relationships.status": "verified, pending, stale, contested.",
  modules: "Modules optionnels : un pays peut en fournir aucun, quelques-uns ou tous. L'interface affiche ce qui existe.",
  "modules.hero": "En-tête du pays : image, phrase de positionnement, résumé.",
  "modules.hero.imageId": "Identifiant d'une image de modules.media.assets.",
  "modules.hero.tagline": "Phrase de positionnement éditoriale, sans superlatif non sourcé.",
  "modules.hero.summary": "Résumé court ; à défaut, l'interface assemble les affirmations vérifiées.",
  "modules.hero.bannerImages": "Image d'ouverture de chaque onglet (clés : relations, economy, defense, issues, outlook) : identifiants de modules.media.assets.",
  "modules.media.assets": "Catalogue des images. Une image n'est publiable que si licenseStatus = cleared ET commercialReuseAllowed = true.",
  "assets.path": "Chemin sous /public (ex. /approche/<iso3>/hero.webp).",
  "assets.alt": "Description factuelle de l'image (accessibilité).",
  "assets.credit": "Légende de crédit affichée sous l'image.",
  "assets.licenseStatus": "cleared (licence lue, usage commercial permis), to_confirm ou unknown (affichées en démonstration seulement).",
  "assets.commercialReuseAllowed": "true seulement si la licence autorise expressément la réutilisation commerciale.",
  "assets.attributionRequired": "true si la licence impose une attribution.",
  "assets.obligations": "Obligations d'attribution à reprendre dans la légende.",
  "assets.reviewedAt": "Date de la vérification de la licence.",
  "assets.focal": "Point d'intérêt (0 à 100 %) pour le recadrage sur mobile.",
  "assets.subject": "Sujet de l'image (ex. nom du lieu).",
  sourceIds: "Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey).",
  demo: "Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé.",
  id: "Identifiant unique dans la fiche.",
  title: "Titre affiché.",
  summary: "Résumé factuel, daté et sourcé.",
  tags: "Étiquettes courtes.",
  date: "Date ou année de l'élément (chronologie, calendrier).",
  status: "Statut libre ; pour un calendrier : prévu, annoncé, réalisé.",
  url: "Adresse de la page officielle de l'élément.",
  imageId: "Identifiant d'une image de modules.media.assets ; sans image, un visuel neutre est affiché.",
  observationKey: "Clé d'une observation de la fiche : la valeur affichée vient d'elle.",
  valueText: "Valeur déclarée en texte, avec period, unit et sourceIds (si observationKey est absent).",
  unit: "Unité de la valeur.",
  period: "Période de la valeur.",
  note: "Note explicative courte.",
  label: "Libellé affiché.",
  parentId: "Identifiant du nœud parent dans l'organigramme ; null pour la racine. Aucun lien hiérarchique sans source.",
  layerId: "Couche de la carte du module (id de couche).",
  featureId: "Objet de la carte du module (id d'objet).",
  category: "Catégorie (ex. aviation de combat).",
  inServiceText: "Nombre en service à une date précise, seulement s'il est vérifié et daté.",
  system: "Dispositif officiel publié (jamais un niveau inventé).",
  level: "Niveau ou stade en vigueur du dispositif officiel.",
  validFrom: "Début de validité (AAAA-MM-JJ).",
  stages: "Stades du dispositif dans l'ordre.",
  horizon: "Horizon justifié (« 3–10 ans »). L'ordre des dossiers n'est pas un classement.",
  scope: "Portée en étiquettes : national, european, international. Jamais en pourcentages.",
  subthemes: "Sous-thèmes du dossier.",
  situation: "Contexte et situation actuelle : faits sourcés et datés.",
  whyStrategic: "Analyse attribuée : pourquoi le dossier est stratégique.",
  actors: "Acteurs concernés.",
  interests: "Intérêts en jeu.",
  recentDevelopments: "Évolutions récentes datées.",
  indicators: "Indicateurs à surveiller.",
  uncertainties: "Hypothèses et incertitudes.",
  updatedAt: "Date de dernière actualisation du dossier.",
  state: "needs_methodology (description qualitative, aucun pourcentage) ou measured (renvoie à observationKey).",
  kind: "Nature : pour un scénario reinforcement, pressure ou fragility ; pour un objet de carte, sa nature (« Base permanente »).",
  assumptions: "Hypothèses du scénario.",
  triggers: "Déclencheurs du scénario.",
  weakSignals: "Signaux faibles à observer.",
  consequences: "Conséquences possibles.",
  limits: "Limites du scénario ; aucune probabilité chiffrée tant qu'aucun modèle n'est publié.",
  view: "Cadrage initial de la carte (centre et zoom).",
  "view.lat": "Latitude du centre initial de la carte (WGS84).",
  "view.lon": "Longitude du centre initial de la carte (WGS84).",
  "view.zoom": "Niveau de zoom initial (1 à 14).",
  "hub.name": "Nom du point d'attache (ex. la capitale).",
  "hub.lat": "Latitude du point d'attache (WGS84).",
  "hub.lon": "Longitude du point d'attache (WGS84).",
  hub: "Point d'attache (ex. la capitale) relié à l'objet sélectionné.",
  layers: "Couches sélectionnables de la carte.",
  "layers.id": "Identifiant stable de la couche (unique dans la carte).",
  "layers.theme": "defense, economy, relations, interests, risks, infrastructure.",
  "layers.icon": "Pictogramme des marqueurs (nom du jeu lib/approche/icons.ts).",
  "layers.color": "Couleur de la légende, hexadécimal #rrggbb.",
  "layers.description": "Ce que contient la couche.",
  "layers.attribution": "Mention d'attribution de la donnée.",
  "layers.license": "Licence du jeu de données.",
  "layers.sourceUrl": "Adresse du jeu de données.",
  "layers.lastUpdatedAt": "Date de dernière mise à jour du jeu de données.",
  "layers.features": "Objets de la couche (points WGS84).",
  "features.id": "Identifiant stable de l'objet (unique dans la couche).",
  "features.name": "Nom de l'objet.",
  "features.lat": "Latitude en degrés décimaux WGS84 (−90 à 90).",
  "features.lon": "Longitude en degrés décimaux WGS84 (−180 à 180).",
  "features.status": "Actif, Clôturé… : une opération terminée n'est jamais présentée comme en cours.",
  "features.summary": "Description publique et datée de l'objet.",
  swot: "Forces, faiblesses, opportunités, menaces : appréciations attribuées, jamais de score.",
  "modules.outlook.dependencies": "Dépendances stratégiques : qualitatives tant qu'aucun numérateur, dénominateur, période, territoire et méthode ne sont publiés.",
  "modules.defense.threatPosture": "Dispositif officiel de vigilance : système, niveau, date de début, stades.",
};

function describe(path: string[], name: string): string | undefined {
  const clean = path.map((part) => part.replace(/\[\]$/, ""));
  const full = clean.join(".");
  const parent = clean.length > 1 ? `${clean[clean.length - 2]}.${name}` : name;
  return DESCRIPTIONS[full] ?? DESCRIPTIONS[parent] ?? DESCRIPTIONS[name];
}

function annotate(node: Node, path: string[]): void {
  if (node.properties) {
    for (const [name, child] of Object.entries(node.properties)) {
      const next = [...path, name];
      const text = describe(next, name);
      if (text && !child.description) child.description = text;
      annotate(child, next);
    }
  }
  if (node.items) annotate(node.items, [...path.slice(0, -1), `${path[path.length - 1] ?? ""}[]`]);
  for (const option of node.anyOf ?? []) annotate(option, path);
}

/** Le JSON Schema d'une fiche pays, tel que lu par l'interface, annoté de la description de chaque champ. */
export function buildSchema(): Node {
  const schema = z.toJSONSchema(CountryDataSchema, { io: "input", unrepresentable: "any" }) as Node;
  annotate(schema, []);
  schema.title = "Fiche pays « Approche » — schéma version " + SCHEMA_VERSION;
  return schema;
}

const PLAIN: Record<string, string> = { string: "texte", number: "nombre", boolean: "booléen", object: "objet", array: "liste", null: "null" };

function typeLabel(node: Node): string {
  if (node.anyOf) {
    const options = node.anyOf.filter((option) => option.type !== "null");
    const nullable = options.length !== node.anyOf.length;
    return `${options.map(typeLabel).join(" ou ")}${nullable ? " ou null" : ""}`;
  }
  if (Array.isArray(node.type)) return node.type.map((type) => PLAIN[type] ?? type).join(" ou ");
  if (node.enum) return node.enum.map((value) => `\`${String(value)}\``).join(" · ");
  if (node.const !== undefined) return `\`${String(node.const)}\``;
  if (node.type === "array") {
    const inner = node.items ? typeLabel(node.items) : "valeurs";
    return inner === "objet" ? "liste d'objets" : `liste de ${inner}`;
  }
  if (node.type === "string") {
    const pattern = String(node.pattern ?? "");
    if (pattern.includes("\\d{4}-\\d{2}-\\d{2}")) return "date AAAA-MM-JJ";
    if (pattern.includes("0-9a-fA-F")) return "couleur #rrggbb";
    if (node.format === "uri") return "adresse https://";
    return "texte";
  }
  if (node.type === "number") return "nombre";
  if (node.type === "boolean") return "booléen";
  if (node.type === "object") return node.additionalProperties && !node.properties ? "dictionnaire texte → texte" : "objet";
  return String(node.type ?? "valeur");
}

function constraints(node: Node): string {
  const parts: string[] = [];
  const target = node.anyOf ? (node.anyOf.find((option) => option.type !== "null") ?? node) : node;
  if (target.minLength !== undefined && target.minLength === target.maxLength) {
    parts.push(`exactement ${String(target.minLength)} caractères`);
  } else {
    if (typeof target.minLength === "number" && target.minLength > 0) parts.push(target.minLength === 1 ? "non vide" : `longueur ≥ ${target.minLength}`);
    if (typeof target.maxLength === "number") parts.push(`longueur ≤ ${target.maxLength}`);
  }
  if (typeof target.minimum === "number") parts.push(`≥ ${target.minimum}`);
  if (typeof target.maximum === "number") parts.push(`≤ ${target.maximum}`);
  if (typeof target.minItems === "number" && target.minItems > 0) parts.push(`au moins ${target.minItems} élément(s)`);
  return parts.join(", ");
}

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Dictionnaire champ par champ : chemin, type, obligatoire ou facultatif, défaut, contraintes, sens. */
export function buildFieldReference(schema: Node): string {
  const rows: string[] = [];
  const seen = new Map<string, string>();
  const walk = (node: Node, path: string[], required: boolean) => {
    const name = path[path.length - 1];
    const here = path.join(".");
    const target = node.anyOf ? (node.anyOf.find((option) => option.type !== "null") ?? node) : node;
    const isObject = target.type === "object" && target.properties;
    const arrayOfObjects = target.type === "array" && target.items?.type === "object" && target.items.properties;
    if (path.length > 0) {
      rows.push(`| \`${here}\` | ${cell(typeLabel(node))} | ${required ? "**oui**" : "non"} | ${node.default !== undefined ? `\`${JSON.stringify(node.default)}\`` : ""} | ${cell(constraints(node))} | ${cell(node.description ?? "")} |`);
    }
    const body = isObject ? target : arrayOfObjects ? (target.items as Node) : null;
    if (!body || !body.properties) return;
    const signature = JSON.stringify(body, (key, value) => (key === "description" ? undefined : value));
    const base = isObject ? here : `${here}[]`;
    if (Object.keys(body.properties).length > 4 && seen.has(signature)) {
      rows.push(`| \`${base}.*\` | _même structure que_ \`${seen.get(signature)}\` | | | | Voir la première occurrence de cette structure. |`);
      return;
    }
    if (Object.keys(body.properties).length > 4) seen.set(signature, base);
    const requiredSet = new Set(body.required ?? []);
    for (const [childName, child] of Object.entries(body.properties)) walk(child, [...path.slice(0, -1), isObject ? name : `${name}[]`, childName].filter((part) => part !== undefined), requiredSet.has(childName));
  };
  const top = new Set(schema.required ?? []);
  for (const [name, child] of Object.entries(schema.properties ?? {})) walk(child, [name], top.has(name));
  return [
    "# Dictionnaire des champs — schéma version 1",
    "",
    "> Fichier **généré** par `npm run approche:contract` à partir des schémas Zod que l'interface lit réellement. Ne pas l'éditer à la main : un test échoue s'il n'est plus à jour.",
    "",
    "Les chemins notent `[]` pour une liste. « Obligatoire » = le champ doit figurer dans le fichier ; un champ facultatif absent prend son défaut. Une valeur absente reste absente : `null` avec `status: \"pending\"`, jamais une estimation. Quand une structure se répète (éléments éditoriaux, cartes), elle n'est détaillée qu'à sa première occurrence.",
    "",
    "| Chemin | Type | Obligatoire | Défaut | Contraintes | Sens |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

const KEY_PATTERN = /["'`]((?:identity|politics|institutions|demography|geography|economy|labour|research|energy)\.[A-Za-z0-9_.${}-]+)["'`]/g;

function listFiles(dir: string, extensions: string[]): string[] {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => extensions.some((extension) => name.endsWith(extension))).map((name) => path.join(dir, name)) : [];
}

/** Clés d'observations lues par les composants et les vues, et fichiers qui les lisent. */
export function scanUiKeys(root: string): { key: string; files: string[] }[] {
  const found = new Map<string, Set<string>>();
  // Seuls les composants lisent des clés : les schémas et les commentaires du dossier lib n'en font pas partie.
  for (const file of listFiles(path.join(root, "components", "approche"), [".tsx", ".ts"])) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(KEY_PATTERN)) {
      const key = match[1];
      if (!found.has(key)) found.set(key, new Set());
      found.get(key)?.add(path.basename(file));
    }
  }
  return [...found].map(([key, files]) => ({ key, files: [...files].sort() })).sort((a, b) => a.key.localeCompare(b.key));
}

/** Rapport des clés lues par l'interface : ce qu'un fichier pays peut renseigner et ce qui s'affiche. */
export function buildUiReport(root: string): string {
  const keys = scanUiKeys(root);
  return [
    "# Ce que l'interface lit — clés d'observations et modules",
    "",
    "> Fichier **généré** par `npm run approche:contract` (analyse du code des composants). Un test échoue s'il n'est plus à jour.",
    "",
    "## Principe",
    "",
    "- Aucun composant n'est écrit pour un pays : tout texte, chiffre, unité, période et source vient du fichier du pays. Un test interdit les noms de pays, d'institutions ou de personnes dans les composants communs.",
    "- Une donnée absente du fichier est **masquée** (appartenance, section d'énergie, structure économique…) ou affichée « Donnée non disponible » (tuiles de chiffres clés) : jamais complétée.",
    "- Les **modules** (`modules.hero`, `media`, `overview`, `relations`, `economy`, `defense`, `issues`, `outlook`) sont lus champ par champ comme décrit dans `APPROCHE_CHAMPS_V1.md` : chaque champ du schéma est consommé par l'interface.",
    "",
    "## Clés d'observations lues par les composants",
    "",
    "Une clé absente du fichier n'est pas une erreur. Une clé nouvelle est acceptée ; elle ne s'affiche que si un composant ou un module (`observationKey`) la référence. Les clés avec `${…}` ou `*` sont des familles (une clé par branche économique, par filière…).",
    "",
    "| Clé | Lue par |",
    "|---|---|",
    ...keys.map(({ key, files }) => `| \`${key}\` | ${files.join(", ")} |`),
    "",
    "`geography.area` désigne la première mesure `geography.area.<source>` du fichier (ex. `geography.area.eurostat`).",
    "",
    "## Familles de clés",
    "",
    `- \`economy.value_added.<code>\` (montant) et \`economy.value_added_share.<code>\` (part calculée) : codes de branche ${VALUE_ADDED_BRANCHES.map((code) => `\`${code}\``).join(", ")} (nomenclature A10), plus \`economy.value_added.total\`. Le graphique de structure de l'économie n'apparaît que si une branche a son montant **et** sa part, avec le total.`,
    `- \`energy.electricity.<clé>\` : ${ELECTRICITY_KEYS.map((key) => `\`${key}\``).join(", ")}. La section « électricité » n'apparaît que si au moins une de ces mesures existe ; le graphique de production exige \`production_total\`. Une filière absente n'est jamais comptée comme nulle : elle tombe dans « non détaillé (calculé) ».`,
    "- `institutions.*` : une ligne d'appartenance n'est affichée que si le fichier la documente (ou la signale `pending`). **Ne pas créer** d'observation pour une organisation dont le pays n'est pas membre : une observation `institutions.*` produit un badge d'appartenance.",
    "- `demography.density` : si présente, remplace la ligne « densité non calculée » de la vue d'ensemble.",
    "",
    "## Libellés",
    "",
    "Les libellés des tuiles (« Population », « PIB nominal »…) sont ceux de l'interface, communs à tous les pays. Pour un sujet propre à un pays, utiliser une observation avec `label` et la référencer par `observationKey` dans un chiffre clé de module.",
    "",
  ].join("\n");
}

/** Contenu attendu de chaque fichier généré (chemin relatif → texte). */
export function buildContractFiles(root: string): Record<string, string> {
  const schema = buildSchema();
  return {
    "docs/approche.schema.v1.json": `${JSON.stringify(schema, null, 2)}\n`,
    "docs/APPROCHE_CHAMPS_V1.md": buildFieldReference(schema),
    "docs/APPROCHE_CHAMPS_UI.md": buildUiReport(root),
  };
}
