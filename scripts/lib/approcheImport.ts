// Import par lot des fiches pays « Approche » : contrôle chaque fichier (schéma, sources, références, collisions, licences, couverture
// d'affichage, niveau documentaire) et produit un rapport par pays. La logique est ici (testable) ; scripts/approche-import.ts en est
// l'interface en ligne de commande. Un fichier valide n'est pas pour autant VRAI : le contrôle porte sur la forme, la traçabilité et
// les règles de publication, jamais sur l'exactitude géopolitique.
import fs from "node:fs";
import path from "node:path";
import { classifyObservations, THEMES, THEME_NONE } from "../../lib/approche/complements";
import { AUTOMATIC_SERIES, TOPIC_HINTS } from "../../lib/approche/keys";
import { coverageProfile, LEVEL_LABELS, longTexts, type CoverageProfile, type DocumentationLevel } from "../../lib/approche/levels";
import { isOtherSourceOf } from "../../lib/approche/measures";
import { CountryDataSchema, type CountryData } from "../../lib/approche/schema";
import { publishProblems } from "../../lib/approche/sourceRegistry";
import { getCountryGeoConfig } from "../../lib/countryGeoConfig";
import { getResolvedCountryProfile } from "../../lib/countryOverlays";
import { getZone } from "../../lib/zones";
import { listCountryFiles } from "./approcheContract";
import { unreadObservationKeys } from "./approcheUnread";

export interface UrlResult {
  url: string;
  status: number | null;
  verdict: "ok" | "blocked" | "dead" | "error";
  note: string;
}

export interface CountryReport {
  file: string;
  code: string;
  name: string;
  /** Erreurs bloquantes : le pays n'est pas enregistré tant qu'il en reste. */
  errors: { schema: string[]; publication: string[]; collisions: string[]; registry: string[] };
  /** Avertissements documentaires : n'empêchent pas l'enregistrement, à lire avant publication. */
  warnings: string[];
  counts: { sources: number; observations: number; verified: number; pending: number; claims: number; relationships: number };
  /** Où s'affiche chaque observation : tuile, module, électricité, autres sources, panneau, masquée. */
  placements: Record<string, number>;
  hidden: { key: string; reason: string }[];
  /** Niveau déclaré dans le fichier (décision éditoriale) ; le niveau n'est jamais calculé ni imposé. */
  declaredLevel: DocumentationLevel | null;
  /** Profil de couverture documentaire (information pour décider du niveau ; la méthode reste à valider). */
  profile: CoverageProfile | null;
  automatic: { worldbank: boolean; eurostat: boolean };
  urls: UrlResult[];
  /** Résultat global : true si aucune erreur bloquante. */
  ok: boolean;
}

/** Textes longs d'un ensemble de modules (pour repérer les contenus répétés ou passe-partout). */
export const moduleStrings = longTexts;

/** Ce qu'un autre pays (déjà enregistré ou du même lot) apporte pour les comparaisons : textes, libellés par clé, clés par libellé. */
export interface PeerProfile {
  code: string;
  texts: Set<string>;
  labelsByKey: Map<string, string>;
  keysByLabel: Map<string, string>;
}

/** Libellé ramené à l'essentiel pour comparer : sans accents, apostrophes, ni mots d'appartenance (« Membre de l'UEMOA » = « Appartenance UEMOA »). */
export function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !["membre", "appartenance", "de", "du", "des", "la", "le", "les", "l", "d", "au", "aux", "en", "et"].includes(word))
    .join(" ");
}

export function peerProfile(code: string, raw: unknown): PeerProfile {
  const data = (raw ?? {}) as { observations?: { key?: string; label?: string | null }[]; modules?: unknown };
  const labelsByKey = new Map<string, string>();
  const keysByLabel = new Map<string, string>();
  for (const observation of data.observations ?? []) {
    if (!observation.key || !observation.label) continue;
    labelsByKey.set(observation.key, observation.label);
    keysByLabel.set(normalizeLabel(observation.label), observation.key);
  }
  return { code, texts: new Set(longTexts(data.modules)), labelsByKey, keysByLabel };
}

/** Pays déjà enregistrés, lus comme référence de comparaison (hors `exclude`). */
export function loadPeers(root: string, exclude: string[] = []): PeerProfile[] {
  return listCountryFiles(root).flatMap(({ code }) => {
    if (exclude.includes(code)) return [];
    try {
      return [peerProfile(code, JSON.parse(fs.readFileSync(path.join(root, "data", "approche", `${code}.json`), "utf8")))];
    } catch {
      return [];
    }
  });
}

export interface ImportContext {
  root: string;
  /** Pays déjà enregistrés (hors fichier en cours) : leurs slugs et codes ne doivent pas être repris. */
  registered: { code: string; slug: string }[];
  /** Autres pays (enregistrés et du même lot) pour comparer textes et libellés ; absent = comparaison avec les pays enregistrés. */
  peers?: PeerProfile[];
}

const errorsCount = (report: CountryReport) => Object.values(report.errors).reduce((sum, list) => sum + list.length, 0);

/** Pays déjà présents dans data/approche/ (code et adresse). */
export function registeredCountries(root: string): { code: string; slug: string }[] {
  return listCountryFiles(root).flatMap(({ code }) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(root, "data", "approche", `${code}.json`), "utf8")) as { slug?: string };
      return [{ code, slug: data.slug ?? "" }];
    } catch {
      return [{ code, slug: "" }];
    }
  });
}

function readAutomatic(root: string, code: string, suffix: "worldbank" | "eurostat"): { sources?: { id: string }[]; observations?: { key: string; id: string }[] } | null {
  const file = path.join(root, "data", "approche", `${code}.${suffix}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function collectSourceIds(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) value.forEach((child) => collectSourceIds(child, into));
  else if (value && typeof value === "object") {
    for (const [name, child] of Object.entries(value as Record<string, unknown>)) {
      if (name === "sourceIds" && Array.isArray(child)) child.forEach((id) => typeof id === "string" && into.add(id));
      else collectSourceIds(child, into);
    }
  }
}

const emptyReport = (file: string, code: string, name: string): CountryReport => ({
  file,
  code,
  name,
  errors: { schema: [], publication: [], collisions: [], registry: [] },
  warnings: [],
  counts: { sources: 0, observations: 0, verified: 0, pending: 0, claims: 0, relationships: 0 },
  placements: {},
  hidden: [],
  declaredLevel: null,
  profile: null,
  automatic: { worldbank: false, eurostat: false },
  urls: [],
  ok: false,
});

/** Contrôle un fichier pays (sans réseau). `raw` est le contenu JSON déjà lu. */
export function analyzeCountry(raw: unknown, fileName: string, ctx: ImportContext): CountryReport {
  const base = path.basename(fileName);
  const fileCode = base.replace(/\.json$/i, "").toUpperCase();
  const rawObject = (raw && typeof raw === "object" ? raw : {}) as { countryCode?: string; name?: string };
  const report = emptyReport(base, rawObject.countryCode ?? fileCode, rawObject.name ?? fileCode);

  // 1. Schéma (Zod) : toutes les anomalies, pas seulement la première.
  const parsed = CountryDataSchema.safeParse(raw);
  if (!parsed.success) {
    report.errors.schema = parsed.error.issues.slice(0, 60).map((issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`);
    report.ok = false;
    return report;
  }
  const data: CountryData = parsed.data;
  const code = data.countryCode;
  report.code = code;
  report.name = data.name;
  report.counts = {
    sources: data.sources.length,
    observations: data.observations.length,
    verified: data.observations.filter((observation) => observation.status === "verified").length,
    pending: data.observations.filter((observation) => observation.status === "pending").length,
    claims: data.claims.length,
    relationships: data.relationships.length,
  };

  // 2. Identité du fichier et enregistrement : nom de fichier, code, adresse unique, zone, fiche de l'ancien modèle et carte existantes.
  if (!/^[A-Z]{3}$/.test(code)) report.errors.registry.push(`countryCode « ${code} » : code ISO 3 attendu`);
  if (fileCode !== code) report.errors.registry.push(`nom de fichier « ${base} » : doit être ${code}.json (countryCode)`);
  const others = ctx.registered.filter((entry) => entry.code !== code);
  const sameSlug = others.find((entry) => entry.slug === data.slug);
  if (sameSlug) report.errors.registry.push(`adresse « ${data.slug} » déjà prise par ${sameSlug.code}`);
  if (!getZone(data.zoneSlug)) report.errors.registry.push(`zoneSlug « ${data.zoneSlug} » : zone inconnue`);
  const profile = getResolvedCountryProfile(data.slug);
  if (!profile) report.errors.registry.push(`slug « ${data.slug} » : aucune fiche pays connue du site (l'ancien modèle fournit la carte, le drapeau et le titre de la page)`);
  else {
    if (profile.iso3 !== code) report.errors.registry.push(`slug « ${data.slug} » : correspond à ${profile.iso3}, pas à ${code}`);
    if (profile.zoneSlug !== data.zoneSlug) report.errors.registry.push(`zoneSlug « ${data.zoneSlug} » : la fiche du site est dans « ${profile.zoneSlug} »`);
    if (profile.name !== data.name) report.warnings.push(`nom « ${data.name} » différent de celui de la fiche du site (« ${profile.name} ») : le titre de la fiche Approche reprend le nom du fichier`);
  }
  if (!getCountryGeoConfig(data.slug)) report.errors.registry.push(`slug « ${data.slug} » : aucune configuration de carte (lib/countryGeoConfig.ts)`);

  // 3. Collisions : doublons dans le fichier, clés et identifiants réservés aux séries automatiques (Banque mondiale, Eurostat).
  const seenKeys = new Map<string, number>();
  data.observations.forEach((observation) => seenKeys.set(observation.key, (seenKeys.get(observation.key) ?? 0) + 1));
  for (const [key, times] of seenKeys) if (times > 1) report.errors.collisions.push(`clé « ${key} » portée ${times} fois dans le fichier (une clé = une valeur)`);
  const seenIds = new Set<string>();
  for (const observation of data.observations) {
    if (seenIds.has(observation.id)) report.errors.collisions.push(`identifiant d'observation « ${observation.id} » en double`);
    seenIds.add(observation.id);
  }
  const worldbank = readAutomatic(ctx.root, code, "worldbank");
  const eurostat = readAutomatic(ctx.root, code, "eurostat");
  report.automatic = { worldbank: worldbank !== null, eurostat: eurostat !== null };
  const reserved = new Set<string>(AUTOMATIC_SERIES.map((series) => series.key));
  for (const file of [worldbank, eurostat]) for (const observation of file?.observations ?? []) reserved.add(observation.key);
  for (const observation of data.observations) {
    if (reserved.has(observation.key)) report.errors.collisions.push(`clé « ${observation.key} » réservée aux séries automatiques : choisir une clé distincte (ex. ${observation.key}_<source>_<année>) et la rattacher par topic`);
  }
  const automaticSourceIds = new Set([...(worldbank?.sources ?? []), ...(eurostat?.sources ?? [])].map((source) => source.id));
  for (const source of data.sources) if (automaticSourceIds.has(source.id)) report.errors.collisions.push(`identifiant de source « ${source.id} » déjà utilisé par une série automatique`);
  const automaticObservationIds = new Set([...(worldbank?.observations ?? []), ...(eurostat?.observations ?? [])].map((observation) => observation.id));
  for (const observation of data.observations) if (automaticObservationIds.has(observation.id)) report.errors.collisions.push(`identifiant d'observation « ${observation.id} » déjà utilisé par une série automatique`);

  // 4. Publication, licences et références : les protections du moteur, sur la fiche fusionnée avec ses séries automatiques.
  const merged = CountryDataSchema.safeParse({
    ...(raw as object),
    sources: [...data.sources, ...(worldbank?.sources ?? []), ...(eurostat?.sources ?? [])],
    observations: [...data.observations, ...(worldbank?.observations ?? []), ...(eurostat?.observations ?? [])],
  });
  if (merged.success) report.errors.publication = publishProblems(merged.data).slice(0, 60);
  else report.errors.schema.push(...merged.error.issues.slice(0, 10).map((issue) => `fusion avec les séries automatiques — ${issue.path.join(".")} : ${issue.message}`));

  // 5. Couverture d'affichage : aucune observation vérifiée ne doit rester sans emplacement.
  const placements = classifyObservations(data);
  for (const placement of placements.values()) report.placements[placement.kind] = (report.placements[placement.kind] ?? 0) + 1;
  report.hidden = data.observations.flatMap((observation) => {
    const placement = placements.get(observation.id);
    return placement?.kind === "hidden" ? [{ key: observation.key, reason: placement.reason }] : [];
  });
  for (const item of unreadObservationKeys(data)) report.warnings.push(`[données invisibles] observation sans emplacement : ${item.key} — ${item.reason}${item.suggestion ? ` (clé lue de même nom : ${item.suggestion})` : ""}`);
  const knownThemes = new Set<string>([...THEMES.map((theme) => theme.id), THEME_NONE]);
  for (const observation of data.observations) if (observation.theme && !knownThemes.has(observation.theme)) report.warnings.push(`theme inconnu « ${observation.theme} » (${observation.key}) : rubrique déduite du préfixe de la clé`);

  // 6. Avertissements documentaires.
  const used = new Set<string>();
  collectSourceIds({ observations: data.observations, claims: data.claims, relationships: data.relationships, modules: data.modules }, used);
  const unused = data.sources.filter((source) => !used.has(source.id)).map((source) => source.id);
  if (unused.length > 0) report.warnings.push(`[sources jamais référencées] ${unused.length} source(s) jamais citée(s) : ${unused.join(", ")}`);
  const noLicense = data.sources.filter((source) => source.license === null).length;
  if (noLicense > 0) report.warnings.push(`${noLicense} source(s) sans licence lue (reuse « citation_only » : un fait cité avec attribution, sans reprise du texte, des images ni de la marque)`);
  const unknownReuse = data.sources.filter((source) => source.reuse === "unknown").length;
  if (unknownReuse > 0) report.warnings.push(`${unknownReuse} source(s) dont la réutilisation n'est pas vérifiée (reuse « unknown »)`);
  if (data.modules.hero?.summary) report.warnings.push("modules.hero.summary : texte libre non sourcé (ignoré à l'affichage si des affirmations vérifiées existent)");
  if (data.modules.hero?.tagline) report.warnings.push("modules.hero.tagline : texte libre non sourcé");
  const hinted = data.observations.filter((observation) => !observation.topic || !AUTOMATIC_SERIES.some((series) => series.topic === observation.topic));
  for (const observation of hinted) {
    const hint = TOPIC_HINTS.find((candidate) => observation.key.startsWith(candidate.prefix) && !/(projection|target)/.test(observation.key));
    if (hint) report.warnings.push(`${observation.key} peut doubler la tuile « ${hint.tile} » : ajouter topic « ${hint.topic} » pour la présenter dans son volet « Autres sources » (sinon elle s'affiche dans un panneau à part)`);
  }
  const lastYear = Number((data.lastCheckedAt ?? "").slice(0, 4)) || new Date().getFullYear();
  for (const observation of data.observations) {
    const year = Number(observation.referencePeriod.slice(0, 4));
    if (observation.status === "verified" && year > 0 && year <= lastYear - 3) report.warnings.push(`${observation.key} : valeur de ${observation.referencePeriod}, ancienne — son libellé et sa méthode doivent le dire`);
  }
  for (const relationship of data.relationships) {
    if (relationship.targetCode && !/^[A-Z]{3}$/.test(relationship.targetCode)) report.warnings.push(`relation « ${relationship.id} » : targetCode « ${relationship.targetCode} » n'est pas un code ISO 3`);
  }

  // Contenu répété : le même texte dans au moins trois endroits de la fiche (ex. un défi repris tel quel en vulnérabilité et en SWOT).
  const occurrences = new Map<string, number>();
  for (const text of moduleStrings(data.modules)) occurrences.set(text, (occurrences.get(text) ?? 0) + 1);
  const repeated = [...occurrences].filter(([, times]) => times >= 3);
  if (repeated.length > 0) report.warnings.push(`[textes répétés] ${repeated.length} texte(s) répété(s) au moins 3 fois dans la fiche (même contenu dans plusieurs rubriques), ex. « ${repeated[0][0].slice(0, 80)}… »`);

  // Textes identiques entre plusieurs pays (autres pays enregistrés et du même lot) : un gabarit non personnalisé n'est pas du contenu du pays.
  const peers = (ctx.peers ?? loadPeers(ctx.root, [code])).filter((peer) => peer.code !== code);
  const myTexts = [...new Set(moduleStrings(data.modules))];
  const sharedWith = peers.flatMap((peer) => {
    const shared = myTexts.filter((text) => peer.texts.has(text));
    return shared.length > 0 ? [{ code: peer.code, shared }] : [];
  });
  if (sharedWith.length > 0) {
    const distinctShared = new Set(sharedWith.flatMap((entry) => entry.shared));
    report.warnings.push(`[textes identiques entre pays] ${distinctShared.size} texte(s) identique(s) à ceux d'autres pays (${sharedWith.map((entry) => `${entry.code} : ${entry.shared.length}`).join(", ")}), ex. « ${[...distinctShared][0].slice(0, 80)}… »`);
  }

  // Topics : un topic regroupe des mesures de même grandeur issues de sources différentes (ou rejoint une tuile automatique) ; un mot de
  // domaine (« economy », « politics », « identity ») ne regroupe aucun indicateur.
  const byTopic = new Map<string, typeof data.observations>();
  for (const observation of data.observations) if (observation.topic) byTopic.set(observation.topic, [...(byTopic.get(observation.topic) ?? []), observation]);
  for (const [topic, members] of byTopic) {
    const automatic = AUTOMATIC_SERIES.some((series) => series.topic === topic) && members.some((member) => typeof member.value === "number");
    const paired = members.some((a) => members.some((b) => isOtherSourceOf(a, b)));
    if (!automatic && !paired) report.warnings.push(`[topic] « ${topic} » ne regroupe pas d'indicateurs comparables (${members.length} observation(s) : ${members.slice(0, 5).map((member) => member.key).join(", ")}${members.length > 5 ? "…" : ""}) : un topic doit réunir des mesures de même grandeur issues de sources différentes, ou reprendre celui d'une tuile (${AUTOMATIC_SERIES.map((series) => series.topic).join(", ")}) ; à retirer ou à préciser`);
  }

  // Libellés : doublons dans la fiche, année du libellé différente de la période, et écarts avec les autres pays (même clé, libellés différents ;
  // même libellé, clés différentes).
  const byLabel = new Map<string, string[]>();
  for (const observation of data.observations) {
    if (!observation.label) continue;
    byLabel.set(normalizeLabel(observation.label), [...(byLabel.get(normalizeLabel(observation.label)) ?? []), observation.key]);
    const years: string[] = observation.label.match(/(?:19|20)\d{2}/g) ?? [];
    const periodYears: string[] = observation.referencePeriod.match(/(?:19|20)\d{2}/g) ?? [];
    if (years.some((year) => !periodYears.includes(year))) report.warnings.push(`[libellés] ${observation.key} : le libellé « ${observation.label} » cite une année absente de la période « ${observation.referencePeriod} »`);
  }
  for (const [label, keys] of byLabel) if (new Set(keys).size > 1) report.warnings.push(`[libellés] même libellé pour plusieurs clés (« ${label} ») : ${[...new Set(keys)].join(", ")}`);
  const sharedFamily = /^(identity|politics|institutions)\./;
  for (const observation of data.observations) {
    if (!observation.label || !sharedFamily.test(observation.key)) continue;
    const others = peers.flatMap((peer) => {
      const label = peer.labelsByKey.get(observation.key);
      return label !== undefined && normalizeLabel(label) !== normalizeLabel(observation.label ?? "") ? [`${peer.code} : « ${label} »`] : [];
    });
    if (others.length > 0) report.warnings.push(`[libellés] ${observation.key} : « ${observation.label} » ici, ${others.slice(0, 4).join(" ; ")}${others.length > 4 ? "…" : ""} ailleurs`);
    const sameLabelOtherKey = peers.flatMap((peer) => {
      const key = peer.keysByLabel.get(normalizeLabel(observation.label ?? ""));
      return key !== undefined && key !== observation.key ? [`${peer.code} : ${key}`] : [];
    });
    if (sameLabelOtherKey.length > 0) report.warnings.push(`[libellés] « ${observation.label} » : clé ${observation.key} ici, ${sameLabelOtherKey.slice(0, 4).join(" ; ")} ailleurs (clés à harmoniser pour comparer les pays)`);
  }

  // 7. Profil de couverture documentaire. Le niveau est une décision éditoriale, jamais calculée ni imposée ; le profil l'éclaire.
  const peerTexts = peers.length > 0 ? new Set(peers.flatMap((peer) => [...peer.texts])) : null;
  report.profile = coverageProfile(data, peerTexts);
  report.declaredLevel = (data.documentationLevel ?? null) as DocumentationLevel | null;

  report.ok = errorsCount(report) === 0;
  return report;
}

/** Contrôles croisés d'un lot : deux fichiers ne peuvent pas porter le même code ni la même adresse. */
export function checkBatch(reports: { report: CountryReport; slug: string }[]): void {
  const byCode = new Map<string, string[]>();
  const bySlug = new Map<string, string[]>();
  for (const { report, slug } of reports) {
    byCode.set(report.code, [...(byCode.get(report.code) ?? []), report.file]);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), report.file]);
  }
  for (const { report, slug } of reports) {
    const sameCode = byCode.get(report.code) ?? [];
    if (sameCode.length > 1) report.errors.registry.push(`code ${report.code} présent dans plusieurs fichiers du lot : ${sameCode.join(", ")}`);
    const sameSlug = bySlug.get(slug) ?? [];
    if (slug && sameSlug.length > 1) report.errors.registry.push(`adresse « ${slug} » présente dans plusieurs fichiers du lot : ${sameSlug.join(", ")}`);
    report.ok = errorsCount(report) === 0;
  }
}

/** Contrôle des adresses des sources : une adresse qui répond (même par redirection) est « ok » ; un site qui refuse les robots est « blocked », à vérifier à la main. */
export async function checkUrls(urls: string[], timeoutMs = 15000, concurrency = 6): Promise<UrlResult[]> {
  const headers = { "user-agent": "Mozilla/5.0 (compatible; EquinoxeBot/1.0; +https://sahel-conflict-map.vercel.app)", accept: "text/html,application/pdf,*/*" };
  const attempt = async (url: string, method: "HEAD" | "GET"): Promise<{ status: number | null; note: string }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { method, headers, redirect: "follow", signal: controller.signal });
      void response.body?.cancel();
      return { status: response.status, note: response.redirected ? "redirigée" : "" };
    } catch (error) {
      const cause = (error as { cause?: { code?: string } }).cause?.code;
      return { status: null, note: controller.signal.aborted ? "délai dépassé" : cause ?? (error instanceof Error ? error.message : "erreur réseau") };
    } finally {
      clearTimeout(timer);
    }
  };
  const verdictOf = (status: number | null): UrlResult["verdict"] => (status === null ? "error" : status < 400 ? "ok" : [401, 403, 405, 429, 451, 999].includes(status) ? "blocked" : status === 404 || status === 410 ? "dead" : "error");
  const results: UrlResult[] = [];
  const queue = [...new Set(urls)];
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      let result = await attempt(url, "HEAD");
      if (result.status === null || result.status >= 400) result = await attempt(url, "GET");
      results.push({ url, status: result.status, verdict: verdictOf(result.status), note: result.note });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return results.sort((a, b) => a.url.localeCompare(b.url));
}

/** Adresses à contrôler d'un fichier : sources et licences. */
export function urlsOf(raw: unknown): string[] {
  const sources = ((raw as { sources?: { canonicalUrl?: string; licenseUrl?: string | null }[] })?.sources ?? []).flatMap((source) => [source.canonicalUrl, source.licenseUrl ?? undefined]);
  return sources.filter((url): url is string => typeof url === "string" && url.length > 0);
}

const mark = (ok: boolean) => (ok ? "✔" : "✖");
const bullet = (items: string[]) => items.map((item) => `  - ${item}`);
const percent = (value: number | null) => (value === null ? "n.d." : `${Math.round(value * 100)} %`);
const profileCell = (report: CountryReport) => (report.profile ? `${percent(report.profile.coverage.score)} / ${percent(report.profile.sources.score)} / ${percent(report.profile.specific.score)}` : "—");

/** Rapport récapitulatif en Markdown : un tableau d'ensemble, puis le détail de chaque pays. */
export function renderReport(reports: CountryReport[], meta: { generatedAt: string; applied: boolean }): string {
  const lines: string[] = [];
  lines.push(`# Rapport d'import des fiches pays « Approche »`, "");
  lines.push(`Généré le ${meta.generatedAt}. ${meta.applied ? "Les pays sans erreur ont été enregistrés." : "Simulation : rien n'a été écrit dans le dépôt."}`, "");
  lines.push("| Pays | Résultat | Erreurs | Avertissements | Observations (vérifiées) | Affichées / masquées | Couverture / sources / spécifique | Niveau déclaré | URL à vérifier |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const report of reports) {
    const hidden = report.hidden.length;
    const shown = report.counts.observations - hidden;
    const urlIssues = report.urls.filter((url) => url.verdict !== "ok").length;
    lines.push(`| ${report.name} (${report.code}) | ${mark(report.ok)} ${report.ok ? "prêt" : "refusé"} | ${errorsCount(report)} | ${report.warnings.length} | ${report.counts.observations} (${report.counts.verified}) | ${shown} / ${hidden} | ${profileCell(report)} | ${report.declaredLevel ? LEVEL_LABELS[report.declaredLevel] : "non déclaré"} | ${report.urls.length ? urlIssues : "non contrôlées"} |`);
  }
  lines.push("");
  for (const report of reports) {
    lines.push(`## ${report.name} (${report.code}) — ${mark(report.ok)} ${report.ok ? "prêt" : "refusé"}`, "");
    lines.push(`Fichier \`${report.file}\` : ${report.counts.sources} sources, ${report.counts.observations} observations (${report.counts.verified} vérifiées, ${report.counts.pending} en attente), ${report.counts.claims} affirmations, ${report.counts.relationships} relations. Séries automatiques présentes : Banque mondiale ${report.automatic.worldbank ? "oui" : "non"}, Eurostat ${report.automatic.eurostat ? "oui" : "non"}.`, "");
    const sections: [string, string[]][] = [
      ["Schéma (Zod)", report.errors.schema],
      ["Publication, sources et références", report.errors.publication],
      ["Collisions avec les séries automatiques et doublons", report.errors.collisions],
      ["Enregistrement (adresse, zone, fiche et carte du site)", report.errors.registry],
    ];
    for (const [title, items] of sections) lines.push(`- ${mark(items.length === 0)} **${title}** : ${items.length === 0 ? "aucune anomalie" : `${items.length} anomalie(s)`}`, ...bullet(items));
    const placed = Object.entries(report.placements).map(([kind, count]) => `${kind} ${count}`).join(", ");
    lines.push(`- ${mark(report.hidden.every((item) => item.reason.startsWith("masquée volontairement")))} **Affichage des observations** : ${placed || "—"}${report.hidden.length ? "" : ""}`, ...bullet(report.hidden.map((item) => `${item.key} non affichée : ${item.reason}`)));
    if (report.urls.length > 0) {
      const bad = report.urls.filter((url) => url.verdict !== "ok");
      lines.push(`- ${mark(bad.every((url) => url.verdict === "blocked"))} **Adresses des sources** : ${report.urls.length - bad.length} répondent, ${bad.length} à vérifier`, ...bullet(bad.map((url) => `${url.url} → ${url.status ?? "aucune réponse"} (${url.verdict}${url.note ? `, ${url.note}` : ""})`)));
    }
    if (report.profile) {
      const profile = report.profile;
      lines.push(`- **Profil de couverture documentaire** (information : le niveau est une décision éditoriale, ${report.declaredLevel ? `déclaré « ${LEVEL_LABELS[report.declaredLevel]} »` : "non déclaré"} ; la méthode de décision reste à valider)`);
      lines.push(`  - Couverture des contenus : ${percent(profile.coverage.score)}${profile.coverage.blocks.some((block) => !block.ok) ? ` — manque : ${profile.coverage.blocks.filter((block) => !block.ok).map((block) => `${block.label} (${block.detail})`).join(" ; ")}` : ""}`);
      lines.push(`  - Qualité des sources : ${percent(profile.sources.score)} — ${profile.sources.parts.map((part) => `${part.label} ${part.detail}`).join(" ; ")}`);
      lines.push(`  - Contenus spécifiques au pays : ${percent(profile.specific.score)} — ${profile.specific.parts.map((part) => `${part.label} ${part.detail}`).join(" ; ")}`);
      lines.push(`  - Ce que donneraient les seuils proposés (non appliqués) : ${profile.suggestion === "incomplete" ? "aucun niveau atteint" : LEVEL_LABELS[profile.suggestion]}`);
    }
    lines.push(`- **Avertissements documentaires** : ${report.warnings.length === 0 ? "aucun" : report.warnings.length}`, ...bullet(report.warnings), "");
  }
  return lines.join("\n");
}
