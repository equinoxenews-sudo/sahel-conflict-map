export type RiskTier = "critical" | "danger" | "watch";

export interface CountryRisk {
  tier: RiskTier;
  label: string;
}

export const RISK_COLORS: Record<RiskTier, string> = {
  critical: "#e53935", // rouge
  danger: "#fb8c00", // orange
  watch: "#fdd835", // jaune
};

export const RISK_LABELS: Record<RiskTier, string> = {
  critical: "Critique",
  danger: "Danger",
  watch: "À surveiller",
};
