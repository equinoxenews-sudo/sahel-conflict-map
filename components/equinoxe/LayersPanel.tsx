import { LAYER_LABELS, LAYER_ORDER, type LayerKey } from "@/lib/layers/types";
import { LEVEL_DISPLAY_COLORS, LEVEL_LABELS } from "@/lib/travelAdvisories";
import { Fragment } from "react";
import LayerIcon from "./LayerIcon";
import styles from "./LayersPanel.module.css";

interface LayersPanelProps {
  enabled: Record<LayerKey, boolean>;
  counts: Record<LayerKey, number>;
  onToggle: (key: LayerKey) => void;
}

export default function LayersPanel({ enabled, counts, onToggle }: LayersPanelProps) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>
        <span className={styles.headingIcon} aria-hidden>
          ⧉
        </span>
        Couches
      </h2>
      <div className={styles.list}>
        {LAYER_ORDER.map((key) => {
          const isOn = enabled[key];
          const count = counts[key];
          return (
            <Fragment key={key}>
            <label
              className={styles.item}
              title={count > 0 ? `${count} élément(s)` : undefined}
            >
              <span className={`${styles.icon} ${key === "risk" ? styles.iconRisk : ""}`}>
                <LayerIcon layerKey={key} />
              </span>
              <span className={styles.label}>{LAYER_LABELS[key]}</span>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={isOn}
                onChange={() => onToggle(key)}
              />
              <span className={isOn ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}>
                <span className={styles.toggleThumb} />
              </span>
            </label>
            {key === "advisories" && isOn ? (
              <div className={styles.legend}>
                {(["red", "orange", "yellow"] as const).map((level) => (
                  <span key={level} className={styles.legendItem}>
                    <i style={{ background: LEVEL_DISPLAY_COLORS[level] }} />
                    {LEVEL_LABELS[level]}
                  </span>
                ))}
                <span className={styles.legendNote}>
                  Pas de couleur : vigilance normale. Rayures : zones plus graves dans le pays. Source : France Diplomatie, Licence Ouverte 2.0.
                </span>
              </div>
            ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
