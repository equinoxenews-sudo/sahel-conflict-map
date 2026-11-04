import type { CountryData } from "./schema";

// Niveaux documentaires d'une fiche pays : « essentiel » et « approfondi ». Les deux niveaux utilisent EXACTEMENT le même moteur, les
// mêmes composants et les mêmes protections de publication : le niveau décrit un degré de complétude, il ne change aucun chemin de code.
//
// Le niveau est une décision ÉDITORIALE : il n'est affiché que s'il est déclaré dans le fichier (`documentationLevel`). Ce module ne
// calcule aucun niveau : il mesure la couverture documentaire réelle (profil à trois axes) pour éclairer cette décision. La méthode de
// décision reste à valider (docs/APPROCHE_NIVEAUX_METHODE.md) ; les seuils proposés ci-dessous ne sont appliqués à rien.

export const DOCUMENTATION_LEVELS = ["essential", "extended"] as const;
export type DocumentationLevel = (typeof DOCUMENTATION_LEVELS)[number];

export const LEVEL_LABELS: Record<DocumentationLevel, string> = {
  essential: "Essentiel",
  extended: "Approfondi",
};

/** Seuils PROPOSÉS (non validés, non appliqués) : chaque axe est une part entre 0 et 1. */
export const PROPOSED_THRESHOLDS = {
  essential: { coverage: 0.6, sources: 0.6, specific: 0.7 },
  extended: { coverage: 0.85, sources: 0.75, specific: 0.9 },
} as const;

export interface CoverageBlock {
  id: string;
  label: string;
  ok: boolean;
  /** Ce qui est présent, pour le rapport. */
  detail: string;
}

export interface CoverageProfile {
  /** Axe 1 : couverture documentaire réelle, part des blocs de contenu attendus qui sont renseignés. */
  coverage: { score: number; blocks: CoverageBlock[] };
  /** Axe 2 : qualité des sources. */
  sources: { score: number; parts: { label: string; value: number; detail: string }[] };
  /** Axe 3 : contenus spécifiques au pays (null si aucun autre pays n'est disponible pour comparer). */
  specific: { score: number | null; parts: { label: string; value: number | null; detail: string }[] };
  /** Ce que donneraient les seuils proposés. Information : rien n'est appliqué ni affiché. */
  suggestion: DocumentationLevel | "incomplete";
}

const count = (value: unknown): number => (Array.isArray(value) ? value.length : 0);
const share = (part: number, whole: number) => (whole === 0 ? 0 : part / whole);
const mean = (values: number[]) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);
const round = (value: number) => Math.round(value * 100) / 100;

/** Textes longs (50 caractères et plus) d'un ensemble de modules : ce qui est réellement rédigé pour le pays. */
export function longTexts(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.trim().length >= 50) into.push(value.trim());
  } else if (Array.isArray(value)) value.forEach((child) => longTexts(child, into));
  else if (value && typeof value === "object") for (const [name, child] of Object.entries(value as Record<string, unknown>)) if (name !== "id" && name !== "sourceIds") longTexts(child, into);
  return into;
}

/**
 * Profil de couverture d'une fiche. `peerTexts` : textes longs des autres pays déjà connus (pour mesurer ce qui est propre au pays) ;
 * null si aucun autre pays n'est disponible.
 */
export function coverageProfile(data: CountryData, peerTexts: Set<string> | null): CoverageProfile {
  const verified = data.observations.filter((observation) => observation.status === "verified" && observation.value !== null);
  const hasKey = (...keys: string[]) => verified.some((observation) => keys.includes(observation.key));
  const { overview, economy, defense, issues, outlook } = data.modules;
  const claims = data.claims.filter((claim) => claim.status === "verified");
  const relations = data.relationships.filter((relationship) => relationship.status === "verified");
  const swot = outlook?.swot;
  const identityKeys = /^(identity|politics)\.(capital|regime|head_of_state|head_of_government|currency|language)$/;
  const specificObservations = verified.filter((observation) => !identityKeys.test(observation.key) && !observation.key.startsWith("institutions."));

  const block = (id: string, label: string, have: number, need: number): CoverageBlock => ({ id, label, ok: have >= need, detail: `${have} / ${need} attendu(s)` });
  const blocks: CoverageBlock[] = [
    { id: "identity", label: "Identité : capitale, régime, monnaie", ok: hasKey("identity.capital") && hasKey("politics.regime") && hasKey("identity.currency"), detail: "identity.capital, politics.regime, identity.currency" },
    { id: "leaders", label: "Dirigeants : chef de l'État ou du gouvernement", ok: hasKey("politics.head_of_state", "politics.head_of_government"), detail: "politics.head_of_state ou politics.head_of_government" },
    block("institutions", "Appartenances institutionnelles", verified.filter((observation) => observation.key.startsWith("institutions.")).length, 1),
    block("claims", "Affirmations vérifiées", claims.length, 5),
    block("relations", "Relations vérifiées", relations.length, 3),
    block("overview", "Vue d'ensemble : forces et défis", Math.min(count(overview?.strengths), 1) + Math.min(count(overview?.challenges), 1), 2),
    block("timeline", "Repères chronologiques", count(overview?.timeline), 3),
    block("sectors", "Secteurs économiques", count(economy?.sectors), 3),
    block("resources", "Ressources", count(economy?.resources), 1),
    block("indicators", "Indicateurs propres au pays (hors identité et appartenances)", specificObservations.length, 8),
    block("defense", "Défense et sécurité", count(defense?.kpis) + count(defense?.organization) + count(defense?.internalSecurity), 1),
    block("issues", "Dossiers stratégiques", count(issues?.issues), 3),
    block("opportunities", "Opportunités et risques", Math.min(count(issues?.opportunities), 1) + Math.min(count(issues?.risks), 1), 2),
    block("vulnerabilities", "Vulnérabilités", count(outlook?.domains), 3),
    block("swot", "SWOT : quatre quadrants", [swot?.strengths, swot?.weaknesses, swot?.opportunities, swot?.threats].filter((part) => count(part) > 0).length, 4),
    block("scenarios", "Scénarios conditionnels", count(outlook?.scenarios), 2),
    block("watch", "Axes de veille", count(outlook?.watchAxes), 2),
  ];
  const coverage = share(blocks.filter((item) => item.ok).length, blocks.length);

  // Qualité des sources : citées, variées, datées, de réutilisation connue, et recoupées pour les affirmations.
  const used = new Set<string>();
  const collect = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") {
      for (const [name, child] of Object.entries(value as Record<string, unknown>)) {
        if (name === "sourceIds" && Array.isArray(child)) child.forEach((id) => typeof id === "string" && used.add(id));
        else collect(child);
      }
    }
  };
  collect({ observations: data.observations, claims: data.claims, relationships: data.relationships, modules: data.modules });
  const publishers = new Set(data.sources.map((source) => source.publisher));
  const cited = data.sources.filter((source) => used.has(source.id)).length;
  const dated = data.sources.filter((source) => source.publishedAt).length;
  const reuseKnown = data.sources.filter((source) => source.reuse !== "unknown").length;
  const crossChecked = claims.filter((claim) => claim.sourceIds.length >= 2).length;
  const sourceParts = [
    { label: "Sources citées", value: share(cited, data.sources.length), detail: `${cited} / ${data.sources.length}` },
    { label: "Diversité des organismes (6 attendus)", value: Math.min(1, publishers.size / 6), detail: `${publishers.size} organisme(s)` },
    { label: "Sources datées (publishedAt)", value: share(dated, data.sources.length), detail: `${dated} / ${data.sources.length}` },
    { label: "Réutilisation connue (pas « unknown »)", value: share(reuseKnown, data.sources.length), detail: `${reuseKnown} / ${data.sources.length}` },
    { label: "Affirmations recoupées (au moins 2 sources)", value: share(crossChecked, claims.length), detail: `${crossChecked} / ${claims.length}` },
  ];
  const sourcesScore = mean(sourceParts.map((part) => part.value));

  // Contenus spécifiques : textes absents des autres pays, et peu répétés d'une rubrique à l'autre.
  const texts = longTexts(data.modules);
  const distinct = new Set(texts);
  const own = peerTexts ? [...distinct].filter((text) => !peerTexts.has(text)).length : 0;
  const specificParts: { label: string; value: number | null; detail: string }[] = [
    { label: "Textes propres au pays (absents des autres pays)", value: peerTexts ? share(own, distinct.size) : null, detail: peerTexts ? `${own} / ${distinct.size}` : "aucun autre pays à comparer" },
    { label: "Textes non répétés dans la fiche", value: share(distinct.size, texts.length), detail: `${distinct.size} distincts sur ${texts.length}` },
  ];
  const specificValues = specificParts.flatMap((part) => (part.value === null ? [] : [part.value]));
  const specificScore = specificValues.length > 0 ? mean(specificValues) : null;

  const reach = (level: DocumentationLevel) => {
    const need = PROPOSED_THRESHOLDS[level];
    return coverage >= need.coverage && sourcesScore >= need.sources && (specificScore === null || specificScore >= need.specific);
  };
  return {
    coverage: { score: round(coverage), blocks },
    sources: { score: round(sourcesScore), parts: sourceParts.map((part) => ({ ...part, value: round(part.value) })) },
    specific: { score: specificScore === null ? null : round(specificScore), parts: specificParts.map((part) => ({ ...part, value: part.value === null ? null : round(part.value) })) },
    suggestion: reach("extended") ? "extended" : reach("essential") ? "essential" : "incomplete",
  };
}
