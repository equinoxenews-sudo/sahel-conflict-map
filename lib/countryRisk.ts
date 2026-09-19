export type RiskTier = "critical" | "danger" | "watch";

export interface CountryRisk {
  tier: RiskTier;
  label: string;
}

// Matches the functional map palette in app/globals.css
// (--status-critical/--status-danger/--status-watch) — kept as literal
// hex here since these values feed Cesium/Leaflet color APIs, not CSS.
export const RISK_COLORS: Record<RiskTier, string> = {
  critical: "#d94a4a", // rouge
  danger: "#e87932", // orange
  watch: "#e0b44c", // or/ambre
};

export const RISK_LABELS: Record<RiskTier, string> = {
  critical: "Critique",
  danger: "Danger",
  watch: "À surveiller",
};
