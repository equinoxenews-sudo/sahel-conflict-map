import { normalizeDomain } from "./reliability";

export type FiabilityGrade = "A" | "B" | "C" | "D" | "E";

/**
 * Cotation éditoriale d'Équinoxe (revue le 29 sept. 2026), distincte de la
 * couverture documentaire : la lettre évalue le média (procédures de
 * vérification, historique éditorial), pas l'exactitude d'une information
 * donnée — une source bien notée peut publier une erreur. Ce n'est ni un
 * classement officiel ni un taux d'exactitude mesuré. Un domaine absent de
 * cette table est "non évalué" (statut distinct de "peu fiable").
 */
export const SOURCE_RELIABILITY: Record<string, FiabilityGrade> = {
  "bbc.com": "A",
  "france24.com": "A",
  "news.un.org": "A",
  "aljazeera.com": "B",
  "middleeasteye.net": "B",
  "africanews.com": "B",
  "jeuneafrique.com": "B",
  "insightcrime.org": "B",
  "rfi.fr": "C",
};

export const FIABILITY_LABELS: Record<FiabilityGrade, string> = {
  A: "Fiabilité élevée",
  B: "Généralement fiable",
  C: "Fiabilité variable",
  D: "Faible fiabilité",
  E: "Très faible fiabilité",
};

/** A (vert foncé) -> E (rouge), même palette que le score de couverture. */
export const FIABILITY_COLORS: Record<FiabilityGrade, string> = {
  A: "#1c7a45",
  B: "#35b779",
  C: "#e0b44c",
  D: "#e87932",
  E: "#d94a4a",
};

export function getSourceFiability(domain: string): FiabilityGrade | null {
  return SOURCE_RELIABILITY[normalizeDomain(domain)] ?? null;
}

/** Meilleure note parmi les domaines cités qui sont notés ; null si aucun
 * des domaines cités n'a de cotation (source "non évaluée"). */
export function computeBriefFiability(domains: string[]): FiabilityGrade | null {
  const grades = domains.map(getSourceFiability).filter((g): g is FiabilityGrade => g !== null);
  if (grades.length === 0) return null;
  return grades.sort()[0];
}
