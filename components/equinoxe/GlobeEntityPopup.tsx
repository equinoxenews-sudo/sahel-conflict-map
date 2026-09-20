import type { EntityPopupData } from "@/lib/layers/types";
import styles from "./GlobeEntityPopup.module.css";

interface GlobeEntityPopupProps {
  data: EntityPopupData;
  x: number;
  y: number;
  onClose: () => void;
}

// A small "bulle" anchored to the clicked point's screen position (see
// Globe3D.tsx's click handler) — deliberately not Cesium's default
// InfoBox (a large sidebar) or SelectionIndicator, neither of which
// matches this site's floating glass-card style.
export default function GlobeEntityPopup({ data, x, y, onClose }: GlobeEntityPopupProps) {
  return (
    <div className={styles.popup} style={{ left: x, top: y }}>
      <div className={styles.header}>
        <span className={styles.badge}>{data.badge}</span>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>
      <h3 className={styles.title}>{data.title}</h3>
      {data.fields.length > 0 ? (
        <dl className={styles.fields}>
          {data.fields.map((field) => (
            <div key={field.label} className={styles.field}>
              <dt className={styles.fieldLabel}>{field.label}</dt>
              <dd className={styles.fieldValue}>{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
