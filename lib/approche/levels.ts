import type { CountryData } from "./schema";

// Niveaux documentaires d'une fiche pays : « essentiel » (de quoi présenter le pays avec ses sources) et « approfondi » (toutes les
// rubriques renseignées). Les deux niveaux utilisent EXACTEMENT le même moteur, les mêmes composants et les mêmes protections de
// publication : le niveau ne change aucun chemin de code, il décrit seulement le degré de complétude du fichier. Il est calculé
// d'après le contenu ; un fichier peut en plus déclarer le niveau visé (`documentationLevel`) et l'import signale l'écart.

export const DOCUMENTATION_LEVELS = ["essential", "extended"] as const;
export type DocumentationLevel = (typeof DOCUMENTATION_LEVELS)[number];

export const LEVEL_LABELS: Record<DocumentationLevel | "incomplete", string> = {
  essential: "Essentiel",
  extended: "Approfondi",
  incomplete: "Incomplet",
};

export interface LevelCheck {
  id: string;
  label: string;
  ok: boolean;
  /** Ce qui est présent / attendu, pour le rapport. */
  detail: string;
}

export interface LevelAssessment {
  /** Le plus haut niveau dont toutes les conditions sont remplies. */
  achieved: DocumentationLevel | "incomplete";
  essential: LevelCheck[];
  extended: LevelCheck[];
}

const count = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

function check(id: string, label: string, have: number, need: number): LevelCheck {
  return { id, label, ok: have >= need, detail: `${have} / ${need} attendu(s)` };
}

/** Conditions de chaque niveau. L'approfondi inclut tout l'essentiel. */
export function assessLevel(data: CountryData): LevelAssessment {
  const verified = data.observations.filter((observation) => observation.status === "verified" && observation.value !== null);
  const hasKey = (...keys: string[]) => verified.some((observation) => keys.includes(observation.key));
  const { overview, economy, defense, issues, outlook } = data.modules;
  const claims = data.claims.filter((claim) => claim.status === "verified").length;
  const relations = data.relationships.filter((relationship) => relationship.status === "verified").length;
  const swot = outlook?.swot;

  const essential: LevelCheck[] = [
    { id: "identity", label: "Identité : capitale, régime, chef de l'État ou du gouvernement, monnaie", ok: hasKey("identity.capital") && hasKey("politics.regime") && hasKey("politics.head_of_state", "politics.head_of_government") && hasKey("identity.currency"), detail: "identity.capital, politics.regime, politics.head_of_state ou politics.head_of_government, identity.currency" },
    check("sources", "Sources documentées", data.sources.length, 3),
    check("claims", "Affirmations vérifiées", claims, 3),
    check("relations", "Relations vérifiées", relations, 1),
    check("overview", "Vue d'ensemble : forces, défis, repères chronologiques (au moins 1, 1 et 2)", Math.min(count(overview?.strengths), 1) + Math.min(count(overview?.challenges), 1) + (count(overview?.timeline) >= 2 ? 1 : 0), 3),
    check("economy", "Économie : au moins un secteur", count(economy?.sectors), 1),
  ];
  const extended: LevelCheck[] = [
    check("claims", "Affirmations vérifiées", claims, 6),
    check("relations", "Relations vérifiées", relations, 3),
    check("timeline", "Repères chronologiques", count(overview?.timeline), 3),
    check("sectors", "Secteurs économiques", count(economy?.sectors), 3),
    check("resources", "Ressources", count(economy?.resources), 1),
    check("defense", "Défense et sécurité (chiffres, organisation ou sécurité intérieure)", count(defense?.kpis) + count(defense?.organization) + count(defense?.internalSecurity), 1),
    check("issues", "Dossiers stratégiques", count(issues?.issues), 3),
    check("opportunities", "Opportunités et risques", Math.min(count(issues?.opportunities), 1) + Math.min(count(issues?.risks), 1), 2),
    check("vulnerabilities", "Vulnérabilités (domaines)", count(outlook?.domains), 3),
    check("swot", "SWOT : les quatre quadrants renseignés", [swot?.strengths, swot?.weaknesses, swot?.opportunities, swot?.threats].filter((part) => count(part) > 0).length, 4),
    check("scenarios", "Scénarios conditionnels", count(outlook?.scenarios), 2),
    check("watch", "Axes de veille", count(outlook?.watchAxes), 2),
  ];

  const essentialOk = essential.every((item) => item.ok);
  const extendedOk = essentialOk && extended.every((item) => item.ok);
  return { achieved: extendedOk ? "extended" : essentialOk ? "essential" : "incomplete", essential, extended };
}

/** Ce qui manque pour atteindre un niveau (vide s'il est atteint). */
export function missingForLevel(assessment: LevelAssessment, level: DocumentationLevel): string[] {
  const checks = level === "essential" ? assessment.essential : [...assessment.essential, ...assessment.extended];
  return checks.filter((item) => !item.ok).map((item) => `${item.label} (${item.detail})`);
}
