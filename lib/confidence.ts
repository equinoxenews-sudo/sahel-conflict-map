/**
 * Indice de confiance des synthèses (analystes de zone, V2) : un pourcentage
 * de 0 à 100 et une étiquette. L'analyste juge la probabilité que l'événement
 * soit réel, même s'il ne dispose que d'une source.
 *
 * « Revendiqué » est un cas à part : une partie prenante s'attribue ou annonce
 * l'événement sans confirmation indépendante. Il se place entre « Probable »
 * et « Très probable ». Si une source indépendante confirme ensuite le fait,
 * l'étiquette suit le pourcentage et la revendication reste affichée à côté
 * (champ claimed_by).
 */
export const CONFIDENCE_LEVELS = [
  { label: "Improbable", min: 0, max: 15, color: "#b3261e" },
  { label: "Peu probable", min: 15, max: 35, color: "#d94a4a" },
  { label: "Possible", min: 35, max: 50, color: "#e87932" },
  { label: "Probable", min: 50, max: 60, color: "#e0b44c" },
  { label: "Revendiqué", min: 60, max: 70, color: "#c9a227" },
  { label: "Très probable", min: 70, max: 85, color: "#7cc46b" },
  { label: "Hautement probable", min: 85, max: 95, color: "#35b779" },
  { label: "Confirmé", min: 95, max: 100, color: "#1c7a45" },
] as const;

export type ConfidenceLabel = (typeof CONFIDENCE_LEVELS)[number]["label"];

export function isConfidenceLabel(value: unknown): value is ConfidenceLabel {
  return typeof value === "string" && CONFIDENCE_LEVELS.some((level) => level.label === value);
}

/** Étiquette correspondant à un pourcentage, hors « Revendiqué » (réservé aux
 *  revendications) : sans revendication, la tranche 60-70 % reste « Probable ». */
export function labelForPercent(percent: number): ConfidenceLabel {
  const p = Math.max(0, Math.min(100, percent));
  if (p < 15) return "Improbable";
  if (p < 35) return "Peu probable";
  if (p < 50) return "Possible";
  if (p < 70) return "Probable";
  if (p < 85) return "Très probable";
  if (p < 95) return "Hautement probable";
  return "Confirmé";
}

export function confidenceColor(label: string | null | undefined): string {
  return CONFIDENCE_LEVELS.find((level) => level.label === label)?.color ?? "#8b96a5";
}

export interface Confidence {
  percent: number;
  label: ConfidenceLabel;
  claimedBy: string | null;
}

/**
 * Rend cohérentes les valeurs proposées par le modèle : pourcentage borné,
 * étiquette déduite du pourcentage, « Revendiqué » seulement avec un auteur de
 * revendication et ramené dans sa tranche. En cas de valeur manquante ou
 * invalide, on retient la prudence (40 %, « Possible »).
 */
export function normalizeConfidence(percent: unknown, label: unknown, claimedBy: unknown): Confidence {
  const claim = typeof claimedBy === "string" && claimedBy.trim() ? claimedBy.trim().slice(0, 120) : null;
  let p = typeof percent === "number" && Number.isFinite(percent) ? Math.round(percent) : 40;
  p = Math.max(0, Math.min(100, p));
  if (label === "Revendiqué" && claim) {
    p = Math.max(60, Math.min(69, p));
    return { percent: p, label: "Revendiqué", claimedBy: claim };
  }
  return { percent: p, label: labelForPercent(p), claimedBy: claim };
}

/** Ancienne échelle de véracité (colonne veracity), conservée pour les pages existantes. */
export function legacyVeracity(label: ConfidenceLabel): string {
  switch (label) {
    case "Confirmé":
      return "Confirmé";
    case "Hautement probable":
    case "Très probable":
      return "Très probable";
    case "Revendiqué":
      return "Revendiqué";
    case "Probable":
    case "Possible":
      return "Possible";
    case "Peu probable":
      return "Peu probable";
    default:
      return "Non confirmé";
  }
}
