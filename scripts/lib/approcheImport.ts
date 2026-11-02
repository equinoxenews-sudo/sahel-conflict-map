// Import par lot des fiches pays « Approche » : contrôle chaque fichier (schéma, sources, références, collisions, licences, couverture
// d'affichage, niveau documentaire) et produit un rapport par pays. La logique est ici (testable) ; scripts/approche-import.ts en est
// l'interface en ligne de commande. Un fichier valide n'est pas pour autant VRAI : le contrôle porte sur la forme, la traçabilité et
// les règles de publication, jamais sur l'exactitude géopolitique.
import fs from "node:fs";
import path from "node:path";
import { classifyObservations, THEMES, THEME_NONE } from "../../lib/approche/complements";
import { AUTOMATIC_SERIES, TOPIC_HINTS } from "../../lib/approche/keys";
import { assessLevel, LEVEL_LABELS, missingForLevel, type DocumentationLevel } from "../../lib/approche/levels";
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
  level: { declared: DocumentationLevel | null; achieved: string; missingExtended: string[]; missingDeclared: string[] };
  automatic: { worldbank: boolean; eurostat: boolean };
  urls: UrlResult[];
  /** Résultat global : true si aucune erreur bloquante. */
  ok: boolean;
}

/** Textes longs d'un ensemble de modules (pour repérer les contenus répétés ou passe-partout). */
export function moduleStrings(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.trim().length >= 50) into.push(value.trim());
  } else if (Array.isArray(value)) value.forEach((child) => moduleStrings(child, into));
  else if (value && typeof value === "object") for (const [name, child] of Object.entries(value as Record<string, unknown>)) if (name !== "id" && name !== "sourceIds") moduleStrings(child, into);
  return into;
}

export interface ImportContext {
  root: string;
  /** Pays déjà enregistrés (hors fichier en cours) : leurs slugs et codes ne doivent pas être repris. */
  registered: { code: string; slug: string }[];
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
  level: { declared: null, achieved: "incomplete", missingExtended: [], missingDeclared: [] },
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
  for (const item of unreadObservationKeys(data)) report.warnings.push(`observation sans emplacement : ${item.key} — ${item.reason}${item.suggestion ? ` (clé lue de même nom : ${item.suggestion})` : ""}`);
  const knownThemes = new Set<string>([...THEMES.map((theme) => theme.id), THEME_NONE]);
  for (const observation of data.observations) if (observation.theme && !knownThemes.has(observation.theme)) report.warnings.push(`theme inconnu « ${observation.theme} » (${observation.key}) : rubrique déduite du préfixe de la clé`);

  // 6. Avertissements documentaires.
  const used = new Set<string>();
  collectSourceIds({ observations: data.observations, claims: data.claims, relationships: data.relationships, modules: data.modules }, used);
  const unused = data.sources.filter((source) => !used.has(source.id)).map((source) => source.id);
  if (unused.length > 0) report.warnings.push(`${unused.length} source(s) jamais citée(s) : ${unused.join(", ")}`);
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
  if (repeated.length > 0) report.warnings.push(`${repeated.length} texte(s) répété(s) au moins 3 fois dans les modules (même contenu dans plusieurs rubriques), ex. « ${repeated[0][0].slice(0, 80)}… »`);

  // 7. Niveau documentaire (même moteur pour les deux niveaux : seule la complétude change).
  const assessment = assessLevel(data);
  const declared = (data.documentationLevel ?? null) as DocumentationLevel | null;
  report.level = {
    declared,
    achieved: assessment.achieved,
    missingExtended: missingForLevel(assessment, "extended"),
    missingDeclared: declared ? missingForLevel(assessment, declared) : [],
  };
  if (declared && report.level.missingDeclared.length > 0) report.warnings.push(`niveau « ${LEVEL_LABELS[declared]} » déclaré mais non atteint : ${report.level.missingDeclared.join(" ; ")}`);

  report.ok = errorsCount(report) === 0;
  return report;
}

/** Contrôles croisés d'un lot : deux fichiers ne peuvent pas porter le même code ni la même adresse. */
export function checkBatch(reports: { report: CountryReport; slug: string; strings?: string[] }[]): void {
  const byCode = new Map<string, string[]>();
  const bySlug = new Map<string, string[]>();
  for (const { report, slug } of reports) {
    byCode.set(report.code, [...(byCode.get(report.code) ?? []), report.file]);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), report.file]);
  }
  // Textes passe-partout : un même texte long dans au moins trois pays du lot est un gabarit non personnalisé.
  const countries = new Map<string, Set<string>>();
  for (const { report, strings } of reports) for (const text of new Set(strings ?? [])) countries.set(text, (countries.get(text) ?? new Set()).add(report.code));
  const generic = [...countries].filter(([, codes]) => codes.size >= 3);
  for (const { report, strings } of reports) {
    const mine = generic.filter(([text]) => (strings ?? []).includes(text));
    if (mine.length > 0) report.warnings.push(`${mine.length} texte(s) identique(s) dans au moins 3 pays du lot (gabarit non personnalisé : scénarios, indicateurs, « pourquoi stratégique »…), ex. « ${mine[0][0].slice(0, 80)}… »`);
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

/** Rapport récapitulatif en Markdown : un tableau d'ensemble, puis le détail de chaque pays. */
export function renderReport(reports: CountryReport[], meta: { generatedAt: string; applied: boolean }): string {
  const lines: string[] = [];
  lines.push(`# Rapport d'import des fiches pays « Approche »`, "");
  lines.push(`Généré le ${meta.generatedAt}. ${meta.applied ? "Les pays sans erreur ont été enregistrés." : "Simulation : rien n'a été écrit dans le dépôt."}`, "");
  lines.push("| Pays | Résultat | Erreurs | Avertissements | Observations (vérifiées) | Affichées / masquées | Niveau atteint | URL à vérifier |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const report of reports) {
    const hidden = report.hidden.length;
    const shown = report.counts.observations - hidden;
    const urlIssues = report.urls.filter((url) => url.verdict !== "ok").length;
    lines.push(`| ${report.name} (${report.code}) | ${mark(report.ok)} ${report.ok ? "prêt" : "refusé"} | ${errorsCount(report)} | ${report.warnings.length} | ${report.counts.observations} (${report.counts.verified}) | ${shown} / ${hidden} | ${LEVEL_LABELS[report.level.achieved as DocumentationLevel | "incomplete"]} | ${report.urls.length ? urlIssues : "non contrôlées"} |`);
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
    lines.push(`- **Niveau documentaire** : ${LEVEL_LABELS[report.level.achieved as DocumentationLevel | "incomplete"]}${report.level.declared ? ` (visé : ${LEVEL_LABELS[report.level.declared]})` : " (non déclaré)"}${report.level.achieved === "extended" ? "" : ` ; pour l'approfondi il manque : ${report.level.missingExtended.join(" ; ") || "—"}`}`);
    lines.push(`- **Avertissements documentaires** : ${report.warnings.length === 0 ? "aucun" : report.warnings.length}`, ...bullet(report.warnings), "");
  }
  return lines.join("\n");
}
