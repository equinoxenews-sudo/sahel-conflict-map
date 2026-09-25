import type { Infrastructure } from "@/types/country";
import styles from "./CountryProfilePage.module.css";

const STATUS_CLASS: Record<Infrastructure["status"], string> = {
  Actif: styles.statusActive,
  Endommagé: styles.statusDamaged,
  "Hors service": styles.statusDown,
  Inconnu: styles.statusUnknown,
};

export default function InfrastructureTable({ items }: { items: Infrastructure[] }) {
  if (items.length === 0) {
    return <div className={styles.emptyState}>Aucune infrastructure référencée pour l&apos;instant.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Type</th>
            <th>Localisation</th>
            <th>Importance</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{item.type}</td>
              <td>{item.location}</td>
              <td>{item.importance}</td>
              <td>
                <span className={`${styles.statusBadge} ${STATUS_CLASS[item.status]}`}>{item.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
