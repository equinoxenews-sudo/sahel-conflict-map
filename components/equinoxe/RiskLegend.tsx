import { RISK_COLORS, RISK_LABELS, type RiskTier } from "@/lib/countryRisk";
import styles from "./RiskLegend.module.css";

const TIERS: RiskTier[] = ["critical", "danger", "watch"];

export default function RiskLegend() {
  return (
    <div className={styles.legend}>
      {TIERS.map((tier) => (
        <div key={tier} className={styles.item}>
          <span className={styles.swatch} style={{ backgroundColor: RISK_COLORS[tier] }} />
          {RISK_LABELS[tier]}
        </div>
      ))}
    </div>
  );
}
