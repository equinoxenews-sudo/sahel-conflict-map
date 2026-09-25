import type { EntityRef } from "@/types/country";
import styles from "./CountryProfilePage.module.css";

export default function EntityCard({ entity }: { entity: EntityRef }) {
  return (
    <div className={styles.entityCard}>
      <div className={styles.entityHead}>
        <span className={styles.entityName}>{entity.name}</span>
        <span className={styles.entityType}>{entity.type}</span>
      </div>
      {entity.role && <span className={styles.entityMeta}>{entity.role}</span>}
      {entity.country && <span className={styles.entityMeta}>{entity.country}</span>}
      {entity.href ? (
        <a href={entity.href} className={styles.entityLink}>
          Voir la fiche →
        </a>
      ) : (
        <span className={styles.entityLink} style={{ color: "var(--text-secondary)" }}>
          Fiche non disponible
        </span>
      )}
    </div>
  );
}
