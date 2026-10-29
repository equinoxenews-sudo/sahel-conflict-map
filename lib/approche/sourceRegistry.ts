import type { CountryData, Observation, Relationship, SourceRecord } from "./schema";

// Registre des sources et politique de licences. Aucune donnée publiée ne doit dépendre d'une source dont les droits de
// réutilisation commerciale ne sont pas établis : le contrôle est ici, appliqué par les tests et par `publishProblems`.

/** Organismes dont les données sont exclues de toute collecte et publication sans autorisation commerciale explicite. */
export const BLOCKED_PUBLISHERS: readonly RegExp[] = [/\bSIPRI\b/i, /Stockholm International Peace Research Institute/i];

/**
 * Séries de la Banque mondiale qui relaient des données SIPRI : exclues elles aussi (les droits suivent la donnée d'origine,
 * pas la plateforme qui la redistribue).
 */
export const BLOCKED_WORLD_BANK_INDICATORS: readonly string[] = [
  "MS.MIL.XPND.GD.ZS",
  "MS.MIL.XPND.CD",
  "MS.MIL.XPND.CN",
  "MS.MIL.XPND.KD",
  "MS.MIL.XPND.ZS",
  "MS.MIL.XPND.GN.ZS",
];

export function isBlockedSource(source: SourceRecord): boolean {
  if (source.reuse === "commercial_license_required") return true;
  if (BLOCKED_PUBLISHERS.some((pattern) => pattern.test(source.publisher) || pattern.test(source.title) || pattern.test(source.canonicalUrl))) return true;
  return Boolean(source.datasetId && BLOCKED_WORLD_BANK_INDICATORS.includes(source.datasetId));
}

/** Sources de référence que la fiche peut citer ; leurs adresses exactes sont celles de la série ou de la page consultée. */
export const SIPRI_ENTRY: SourceRecord = {
  id: "S10-SIPRI",
  publisher: "SIPRI",
  title: "SIPRI Military Expenditure Database",
  canonicalUrl: "https://www.sipri.org/databases/milex",
  accessedAt: "2026-10-29",
  license: "Autorisation commerciale requise",
  reuse: "commercial_license_required",
  methodNotes: "Exclue de toute collecte, import ou actualisation automatique tant qu'aucune autorisation commerciale écrite n'a été obtenue ; vaut aussi pour les indicateurs SIPRI redistribués par la Banque mondiale.",
  language: "en",
};

/**
 * Problèmes des modules d'une fiche réelle : aucun contenu de démonstration, et chaque élément identifiable cite au moins une source
 * (ou renvoie à une observation sourcée).
 */
export function moduleProblems(value: unknown, path = "modules"): string[] {
  const problems: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((child, index) => problems.push(...moduleProblems(child, `${path}[${index}]`)));
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.demo === true) problems.push(`${path} : contenu de démonstration dans une fiche réelle`);
    if (typeof record.path === "string" && typeof record.licenseStatus === "string" && record.licenseStatus !== "cleared") problems.push(`${path} (${String(record.id)}) : image sans licence confirmée (${record.licenseStatus})`);
    const sources = record.sourceIds;
    if (typeof record.id === "string" && Array.isArray(sources) && sources.length === 0 && !record.observationKey) problems.push(`${path} (${record.id}) : aucune source`);
    for (const [key, child] of Object.entries(record)) problems.push(...moduleProblems(child, `${path}.${key}`));
  }
  return problems;
}

/** Raisons pour lesquelles une fiche ne peut pas être publiée ; liste vide = publiable. */
export function publishProblems(data: CountryData): string[] {
  const problems: string[] = [];
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  if (sources.size !== data.sources.length) problems.push("identifiants de sources en double");
  for (const source of data.sources) {
    if (isBlockedSource(source)) problems.push(`source exclue (licence) : ${source.id}`);
  }
  const check = (label: string, id: string, sourceIds: string[]) => {
    if (sourceIds.length === 0) problems.push(`${label} ${id} : aucune source`);
    for (const sourceId of sourceIds) {
      const source = sources.get(sourceId);
      if (!source) problems.push(`${label} ${id} : source inconnue ${sourceId}`);
      else if (isBlockedSource(source)) problems.push(`${label} ${id} : source exclue ${sourceId}`);
    }
  };
  const seen = new Set<string>();
  for (const observation of data.observations) {
    if (seen.has(observation.id)) problems.push(`observation en double : ${observation.id}`);
    seen.add(observation.id);
    check("observation", observation.id, observation.sourceIds);
    if (observation.status === "verified" && observation.verifiedAt === null) problems.push(`observation ${observation.id} : « verified » sans date de vérification`);
    if (observation.status === "verified" && observation.value === null) problems.push(`observation ${observation.id} : « verified » sans valeur`);
  }
  for (const claim of data.claims) check("affirmation", claim.id, claim.sourceIds);
  problems.push(...moduleProblems(data.modules));
  for (const relationship of data.relationships) {
    check("relation", relationship.id, relationship.sourceIds);
    if (relationship.status === "verified" && relationship.lastReviewedAt === null) problems.push(`relation ${relationship.id} : « verified » sans date de vérification`);
  }
  return problems;
}

/** Observations affichables : vérifiées et issues de sources autorisées. Les autres restent invisibles côté public. */
export function publishedObservations(data: CountryData): Observation[] {
  if (data.publication !== "published") return [];
  const blocked = new Set(data.sources.filter(isBlockedSource).map((source) => source.id));
  return data.observations.filter((observation) => observation.status === "verified" && observation.value !== null && !observation.sourceIds.some((id) => blocked.has(id)));
}

/** Relations affichables : vérifiées et issues de sources autorisées. */
export function publishedRelationships(data: CountryData): Relationship[] {
  if (data.publication !== "published") return [];
  const blocked = new Set(data.sources.filter(isBlockedSource).map((source) => source.id));
  return data.relationships.filter((relationship) => relationship.status === "verified" && !relationship.sourceIds.some((id) => blocked.has(id)));
}
