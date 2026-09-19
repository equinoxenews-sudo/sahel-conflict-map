import { LAYER_LABELS, LAYER_ORDER, type LayerKey } from "@/lib/layers/types";
import styles from "./LayersPanel.module.css";

interface LayersPanelProps {
  enabled: Record<LayerKey, boolean>;
  counts: Record<LayerKey, number>;
  onToggle: (key: LayerKey) => void;
}

export default function LayersPanel({ enabled, counts, onToggle }: LayersPanelProps) {
  return (
    <div className={styles.column}>
      <h2 className={styles.heading}>Couches</h2>
      <div className={styles.list}>
        {LAYER_ORDER.map((key) => (
          <label key={key} className={styles.item}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={enabled[key]}
              onChange={() => onToggle(key)}
            />
            <span className={styles.label}>{LAYER_LABELS[key]}</span>
            <span className={styles.count}>{counts[key]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
