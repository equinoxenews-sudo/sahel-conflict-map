// Carte des outils OSINT (Mon espace > Outils) : logique pure, sans React, testée dans tests/osint-framework.test.ts.
// Données : OSINT Framework (https://github.com/lockfale/osint-framework), licence MIT, © 2017 Justin Nordine,
// converties par scripts/gen-osint-framework.mjs en public/data/osint-framework.json.
import { normalizeQuery } from "./search";

export const OSINT_DATA_URL = "/data/osint-framework.json";
/** Traduction française facultative (scripts/translate-osint-framework.ts), indexée par adresse de l'outil. */
export const OSINT_FR_URL = "/data/osint-framework.fr.json";
export const OSINT_LICENSE_URL = "/data/osint-framework.LICENSE.txt";

export interface OsintNode {
  name: string;
  type: "folder" | "url";
  url?: string;
  description?: string;
  /** Absent quand l'outil est en ligne. */
  status?: "degraded" | "down" | "defunct";
  pricing?: string;
  bestFor?: string;
  input?: string;
  output?: string;
  opsec?: "active" | "passive";
  opsecNote?: string;
  localInstall?: true;
  googleDork?: true;
  registration?: true;
  editUrl?: true;
  api?: true;
  invitationOnly?: true;
  deprecated?: true;
  /** Outil sans adresse web ordinaire (bookmarklet « javascript: » de l'original) : jamais proposé comme lien. */
  noLink?: true;
  children?: OsintNode[];
}

/**
 * Adresse que l'on peut ouvrir : uniquement du web ordinaire (http ou https). Les données viennent d'un dépôt tiers :
 * une adresse « javascript: » ou « data: » s'exécuterait dans l'espace connecté, elle est donc toujours refusée.
 */
export function safeToolUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Champs de texte d'un outil traduits en français. */
export interface OsintTranslation {
  description?: string;
  bestFor?: string;
  input?: string;
  output?: string;
  opsecNote?: string;
}

export const TRANSLATED_FIELDS = ["description", "bestFor", "input", "output", "opsecNote"] as const;
export type OsintTranslations = Record<string, OsintTranslation>;

export const ROOT_ID = "r";

/** Nom affiché : sans les repères de l'original en fin de nom, « (T) », « (R) », « (D) », « (M) », « (R$) »… */
export function displayName(name: string): string {
  return name.replace(/\s*\([A-Z$]{1,4}(?:\s*,\s*[A-Z$]{1,4})*\)\s*$/, "").trim() || name;
}

/** Identifiants de position : « r » pour la racine, « r.3.2 » pour le 3ᵉ enfant du 4ᵉ enfant de la racine… */
export function childId(parentId: string, index: number): string {
  return `${parentId}.${index}`;
}

/** Identifiants de tous les ancêtres d'un nœud, de la racine jusqu'à son parent. */
export function ancestorsOf(id: string): string[] {
  const parts = id.split(".");
  const ancestors: string[] = [];
  for (let length = 1; length < parts.length; length++) ancestors.push(parts.slice(0, length).join("."));
  return ancestors;
}

export function findNode(root: OsintNode, id: string): OsintNode | null {
  const parts = id.split(".");
  if (parts[0] !== ROOT_ID) return null;
  let node: OsintNode = root;
  for (const part of parts.slice(1)) {
    const child: OsintNode | undefined = node.children?.[Number(part)];
    if (!child) return null;
    node = child;
  }
  return node;
}

/** Noms de la racine jusqu'au nœud (nom d'affichage). */
export function pathNames(root: OsintNode, id: string): string[] {
  const names: string[] = [];
  const parts = id.split(".");
  let node: OsintNode | undefined = root;
  names.push(displayName(root.name));
  for (const part of parts.slice(1)) {
    node = node?.children?.[Number(part)];
    if (!node) break;
    names.push(displayName(node.name));
  }
  return names;
}

export function countTools(node: OsintNode): number {
  if (node.type !== "folder") return 1;
  return (node.children ?? []).reduce((sum, child) => sum + countTools(child), 0);
}

// --- Placement de l'arbre -------------------------------------------------------------------------------------

export interface LaidOutNode {
  id: string;
  node: OsintNode;
  depth: number;
  x: number;
  y: number;
  hasChildren: boolean;
  expanded: boolean;
}

export interface LaidOutLink {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TreeLayout {
  nodes: LaidOutNode[];
  links: LaidOutLink[];
  width: number;
  height: number;
}

export interface LayoutOptions {
  /** Distance entre deux colonnes (un niveau de l'arbre). */
  columnWidth: number;
  /** Hauteur d'une ligne : une feuille visible occupe une ligne. */
  rowHeight: number;
  /** Position horizontale de la racine, réservée à son libellé placé à gauche. */
  originX: number;
  /** Marge en haut et en bas. */
  padding: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = { columnWidth: 232, rowHeight: 22, originX: 190, padding: 24 };

/**
 * Place les nœuds visibles : un nœud est visible si tous ses ancêtres sont dépliés. Chaque feuille visible prend une
 * ligne ; un nœud déplié se centre en hauteur sur ses enfants. La racine est toujours dépliée.
 */
export function layoutTree(root: OsintNode, expanded: ReadonlySet<string>, options: Partial<LayoutOptions> = {}): TreeLayout {
  const { columnWidth, rowHeight, originX, padding } = { ...DEFAULT_LAYOUT, ...options };
  const nodes: LaidOutNode[] = [];
  const links: LaidOutLink[] = [];
  let nextRow = 0;
  let maxDepth = 0;

  function place(node: OsintNode, id: string, depth: number): number {
    maxDepth = Math.max(maxDepth, depth);
    const kids = node.children ?? [];
    const isOpen = kids.length > 0 && (id === ROOT_ID || expanded.has(id));
    const x = originX + depth * columnWidth;
    let y: number;
    const placed: { id: string; y: number }[] = [];
    if (isOpen) {
      kids.forEach((child, index) => {
        const childIdValue = childId(id, index);
        placed.push({ id: childIdValue, y: place(child, childIdValue, depth + 1) });
      });
      y = (placed[0].y + placed[placed.length - 1].y) / 2;
    } else {
      y = padding + nextRow * rowHeight;
      nextRow += 1;
    }
    nodes.push({ id, node, depth, x, y, hasChildren: kids.length > 0, expanded: isOpen });
    for (const child of placed) links.push({ id: child.id, x1: x, y1: y, x2: x + columnWidth, y2: child.y });
    return y;
  }

  place(root, ROOT_ID, 0);
  return {
    nodes,
    links,
    width: originX + (maxDepth + 1) * columnWidth + 120,
    height: padding * 2 + Math.max(nextRow, 1) * rowHeight,
  };
}

// --- Recherche ------------------------------------------------------------------------------------------------

export interface SearchHit {
  id: string;
  node: OsintNode;
  /** Plus petit = plus pertinent : 0 nom commençant par la recherche, 1 nom la contenant, 2 texte la contenant. */
  rank: number;
}

export const MIN_SEARCH_LENGTH = 2;

/** Outils et catégories dont le nom (ou la description) contient tous les mots de la recherche, accents ignorés. */
export function searchTree(root: OsintNode, query: string, limit = 60): SearchHit[] {
  const q = normalizeQuery(query);
  if (q.length < MIN_SEARCH_LENGTH) return [];
  const words = q.split(" ");
  const hits: SearchHit[] = [];
  // L'original liste parfois deux fois le même outil dans la même catégorie : une seule réponse suffit.
  const seen = new Set<string>();

  (function walk(node: OsintNode, id: string) {
    if (id !== ROOT_ID) {
      const name = normalizeQuery(displayName(node.name));
      const text = normalizeQuery(`${node.description ?? ""} ${node.bestFor ?? ""}`);
      const inName = words.every((word) => name.includes(word));
      const inText = !inName && words.every((word) => name.includes(word) || text.includes(word));
      const key = `${ancestorsOf(id).pop()}|${name}|${node.url ?? ""}`;
      if ((inName || inText) && !seen.has(key)) {
        seen.add(key);
        hits.push({ id, node, rank: inName ? (name.startsWith(q) ? 0 : 1) : 2 });
      }
    }
    node.children?.forEach((child, index) => walk(child, childId(id, index)));
  })(root, ROOT_ID);

  return hits.sort((a, b) => a.rank - b.rank || a.node.name.localeCompare(b.node.name, "fr")).slice(0, limit);
}

/** Catégories à déplier pour montrer toutes les réponses d'une recherche. */
export function idsToReveal(hits: readonly SearchHit[]): Set<string> {
  const ids = new Set<string>();
  for (const hit of hits) for (const ancestor of ancestorsOf(hit.id)) ids.add(ancestor);
  return ids;
}

// --- Explications en français ---------------------------------------------------------------------------------

export interface Fact {
  label: string;
  tone: "good" | "warn" | "bad" | "info";
}

const PRICING_FACTS: Record<string, Fact> = {
  free: { label: "Gratuit", tone: "good" },
  freemium: { label: "Gratuit, avec offre payante", tone: "info" },
  "free/freemium": { label: "Gratuit, avec offre payante", tone: "info" },
  paid: { label: "Payant", tone: "warn" },
};

const STATUS_FACTS: Record<string, Fact> = {
  degraded: { label: "Service dégradé", tone: "warn" },
  down: { label: "Hors service", tone: "bad" },
  defunct: { label: "Disparu", tone: "bad" },
};

/** Repères d'un outil, en français : prix, état, discrétion, et les contraintes d'usage. */
export function toolFacts(node: OsintNode): Fact[] {
  if (node.type === "folder") return [];
  const facts: Fact[] = [];
  const pricing = node.pricing ? PRICING_FACTS[node.pricing] : undefined;
  if (pricing) facts.push(pricing);
  const status = node.status ? STATUS_FACTS[node.status] : undefined;
  if (status) facts.push(status);
  if (node.deprecated) facts.push({ label: "Obsolète", tone: "bad" });
  if (node.opsec === "passive") facts.push({ label: "Discret (passif)", tone: "good" });
  if (node.opsec === "active") facts.push({ label: "Actif : peut laisser une trace chez la cible", tone: "warn" });
  if (node.registration) facts.push({ label: "Inscription requise", tone: "warn" });
  if (node.invitationOnly) facts.push({ label: "Sur invitation", tone: "warn" });
  if (node.localInstall) facts.push({ label: "À installer en local", tone: "info" });
  if (node.googleDork) facts.push({ label: "Requête Google Dork", tone: "info" });
  if (node.editUrl) facts.push({ label: "Adresse à modifier à la main", tone: "info" });
  if (node.api) facts.push({ label: "API disponible", tone: "info" });
  return facts;
}

/** Texte d'un champ : la traduction française si elle existe, sinon le texte d'origine (anglais). */
export function pickText(
  node: OsintNode,
  field: (typeof TRANSLATED_FIELDS)[number],
  translations: OsintTranslations | null,
): { text: string; translated: boolean } | null {
  const french = node.url ? translations?.[node.url]?.[field]?.trim() : undefined;
  if (french) return { text: french, translated: true };
  const original = node[field]?.trim();
  return original ? { text: original, translated: false } : null;
}

/** À quoi sert chaque grande catégorie (premier niveau de l'OSINT Framework). */
export const CATEGORY_NOTES: Record<string, string> = {
  Username: "Retrouver les comptes liés à un pseudonyme : moteurs de recherche de pseudos et vérificateurs de présence sur des centaines de sites.",
  "Email Address": "Vérifier qu'une adresse e-mail existe, retrouver à qui elle appartient, la chercher dans des fuites de données et l'analyser.",
  "Domain Name": "Enquêter sur un nom de domaine : propriétaire, historique, certificats, sous-domaines, DNS et technologies utilisées.",
  "Cloud Infrastructure": "Repérer des ressources exposées sur les services cloud (stockages, serveurs, fonctions) liées à une organisation.",
  "IP & MAC Address": "Géolocaliser et qualifier une adresse IP ou MAC : hébergeur, ports ouverts, réputation.",
  "Images / Videos / Docs": "Analyser des médias : recherche d'image inversée, métadonnées, détection de manipulation, recherche dans des documents.",
  "Social Networks": "Outils par réseau social (Facebook, X, Instagram, LinkedIn, Reddit, TikTok…) pour chercher des profils, des publications et des liens.",
  "Instant Messaging": "Rechercher et analyser des canaux et des comptes de messageries (Telegram, WhatsApp, Discord, Signal…).",
  "People Search Engines": "Moteurs de recherche de personnes : coordonnées, adresses, alias. Attention au cadre légal (RGPD) selon le pays.",
  Dating: "Applications de rencontre : vérifier l'existence ou l'identité d'un profil. Usage sensible, à encadrer légalement et éthiquement.",
  "Telephone Numbers": "Identifier l'opérateur, le pays, le type de ligne et les comptes associés à un numéro de téléphone.",
  "Public Records": "Registres publics : tribunaux, propriétés, élections, faillites, brevets et autres documents officiels.",
  "Compliance & Risk Intelligence": "Listes de sanctions, personnes politiquement exposées, conformité et évaluation du risque d'une personne ou d'une entreprise.",
  "Business Records": "Registres d'entreprises, dirigeants, bénéficiaires effectifs et dépôts financiers.",
  Transportation: "Suivi d'avions, de navires, de trains et de véhicules : positions, immatriculations, historiques.",
  "Geolocation Tools / Maps": "Cartes, imagerie satellite, géolocalisation d'images et outils pour repérer et vérifier un lieu.",
  "Search Engines": "Moteurs de recherche généraux et spécialisés, avec leurs opérateurs de recherche avancée.",
  "Online Communities": "Forums, communautés et plateformes de discussion où chercher des témoignages et des profils.",
  Archives: "Archives du web et de documents : retrouver des pages supprimées ou d'anciennes versions.",
  "Language Translation": "Traduction et translittération pour exploiter des sources en langues étrangères.",
  "Mobile OSINT": "Outils liés aux téléphones et aux applications mobiles : informations sur les applications, les appareils et les données publiques associées.",
  "Dark Web": "Moteurs, annuaires et passerelles pour explorer le dark web (réseau Tor), avec les précautions de sécurité qui s'imposent.",
  "Disinformation & Media Verification": "Vérification de faits, d'images et de vidéos ; repérage de manipulations et de campagnes de désinformation.",
  "Blockchain & Cryptocurrency": "Suivre des transactions et des portefeuilles de cryptomonnaies sur la blockchain.",
  Classifieds: "Petites annonces et places de marché : retrouver des annonces, des vendeurs et des historiques.",
  "Encoding / Decoding": "Conversion et décodage de données (base64, hexadécimal, chiffrements simples, adresses…).",
  Tools: "Boîte à outils générale : cadres d'enquête, automatisation, collecte et analyse de données.",
  "AI Tools": "Outils d'intelligence artificielle appliqués à l'OSINT : aide à la recherche, à l'analyse et à la synthèse.",
  "Malicious File Analysis": "Analyser des fichiers et des liens suspects dans un environnement isolé (bacs à sable, antivirus en ligne).",
  "Cyber Threat Intelligence": "Renseignement sur les menaces informatiques : indicateurs de compromission, groupes d'attaque, vulnérabilités.",
  OpSec: "Protéger sa propre sécurité opérationnelle quand on enquête : anonymat, identités fictives, navigateurs isolés.",
  "Documentation / Evidence Capture": "Conserver les preuves : captures d'écran, archivage horodaté, chaîne de conservation.",
  Training: "Se former à l'OSINT : cours, défis, jeux d'entraînement et communautés.",
};
