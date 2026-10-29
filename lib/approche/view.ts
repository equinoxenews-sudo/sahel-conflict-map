import { formatDate, formatUnit, formatValue } from "./formatters";
import { publishedObservations, publishedRelationships } from "./sourceRegistry";
import type { CountryData, Observation, SourceRecord } from "./schema";

// Données prêtes à afficher : tout le texte (valeur, unité, période, sources) est mis en forme ici, côté serveur, à partir des
// observations publiées. Les composants n'écrivent jamais un chiffre à la main.

export interface SourceView {
  id: string;
  title: string;
  publisher: string;
  url: string;
  license: string;
  licenseUrl: string | null;
  reuse: "allowed" | "citation_only" | "unknown";
  accessedAt: string;
  notes: string | null;
}

export interface MetricView {
  key: string;
  /** Libellé propre à l'observation (ex. nom d'une branche économique), sinon vide. */
  label: string;
  /** Valeur chiffrée brute, pour dessiner une part ou une barre (jamais affichée telle quelle). */
  raw: number | null;
  value: string;
  unit: string;
  period: string;
  scope: string;
  methodology: string;
  kind: string;
  verifiedAt: string;
  /** « En fonction depuis » : début de validité, quand une source le donne. */
  validFrom: string | null;
  sources: SourceView[];
  /** Autres mesures du même sujet (autre organisme, autre période), jamais fondues en une moyenne. */
  others: { value: string; unit: string; period: string; scope: string; publisher: string }[];
  /** Valeurs des périodes précédentes pour la courbe, de la plus ancienne à la plus récente. */
  series: { period: string; value: number }[];
}

const KIND_LABELS: Record<Observation["dataKind"], string> = {
  observed: "Donnée observée",
  calculated: "Donnée calculée",
  official_statement: "Déclaration officielle",
  editorial_analysis: "Analyse éditoriale",
};

function sourceView(source: SourceRecord): SourceView {
  return {
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    url: source.canonicalUrl,
    license: source.license ?? "Licence non vérifiée",
    licenseUrl: source.licenseUrl ?? null,
    reuse: source.reuse === "allowed" ? "allowed" : source.reuse === "citation_only" ? "citation_only" : "unknown",
    accessedAt: formatDate(source.accessedAt),
    notes: source.methodNotes ?? null,
  };
}

/** Observations publiées d'une fiche, indexées par clé, avec leurs sources. Une fiche non publiée ne donne rien. */
export function metricViews(data: CountryData): Map<string, MetricView> {
  const published = publishedObservations(data);
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  const views = new Map<string, MetricView>();
  for (const observation of published) {
    const others = published
      .filter((other) => other.id !== observation.id && observation.topic && other.topic === observation.topic)
      .map((other) => ({
        value: formatValue(other),
        unit: formatUnit(other),
        period: other.referencePeriod,
        scope: other.geographicScope,
        publisher: sources.get(other.sourceIds[0])?.publisher ?? "",
      }));
    views.set(observation.key, {
      key: observation.key,
      label: observation.label ?? "",
      raw: typeof observation.value === "number" ? observation.value : null,
      value: formatValue(observation),
      unit: formatUnit(observation),
      period: observation.referencePeriod,
      scope: observation.geographicScope,
      methodology: observation.methodology,
      kind: KIND_LABELS[observation.dataKind],
      verifiedAt: formatDate(observation.verifiedAt),
      validFrom: observation.validFrom ? formatDate(observation.validFrom) : null,
      sources: observation.sourceIds.flatMap((id) => (sources.has(id) ? [sourceView(sources.get(id) as SourceRecord)] : [])),
      others,
      series: observation.history,
    });
  }
  return views;
}

/** Affirmations vérifiées, dans l'ordre du fichier, avec leurs sources. */
export function claimViews(data: CountryData): { id: string; statement: string; sources: SourceView[] }[] {
  if (data.publication !== "published") return [];
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  return data.claims
    .filter((claim) => claim.status === "verified")
    .map((claim) => ({ id: claim.id, statement: claim.statement, sources: claim.sourceIds.flatMap((id) => (sources.has(id) ? [sourceView(sources.get(id) as SourceRecord)] : [])) }));
}

/** Valeurs en attente de vérification : jamais affichées comme des faits, mais comptées pour que le suivi éditorial les voie. */
export function pendingObservations(data: CountryData): { key: string; reason: string }[] {
  return data.observations.filter((observation) => observation.status === "pending").map((observation) => ({ key: observation.key, reason: observation.methodology }));
}

export interface RelationView {
  id: string;
  targetName: string;
  targetIso2: string | null;
  type: "treaty" | "cooperation" | "tension";
  title: string;
  topics: string[];
  summary: string;
  validFrom: string | null;
  reviewedAt: string;
  sources: SourceView[];
}

/** Relations vérifiées avec leurs sources, dans l'ordre du fichier. */
export function relationViews(data: CountryData): RelationView[] {
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  return publishedRelationships(data).map((relationship) => ({
    id: relationship.id,
    targetName: relationship.targetName,
    targetIso2: relationship.targetIso2 ?? null,
    type: relationship.relationType,
    title: relationship.title,
    topics: relationship.topics,
    summary: relationship.summary,
    validFrom: relationship.validFrom ? formatDate(relationship.validFrom) : null,
    reviewedAt: formatDate(relationship.lastReviewedAt),
    sources: relationship.sourceIds.flatMap((id) => (sources.has(id) ? [sourceView(sources.get(id) as SourceRecord)] : [])),
  }));
}
