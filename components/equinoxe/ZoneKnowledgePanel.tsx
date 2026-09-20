import Link from "next/link";
import type { ZoneKnowledgeCategory } from "@/lib/zoneHubContent";
import styles from "./ZoneKnowledgePanel.module.css";
import ZoneCategoryIcon from "./ZoneCategoryIcon";

interface ZoneKnowledgePanelProps {
  zoneSlug: string;
  categories?: ZoneKnowledgeCategory[];
}

export default function ZoneKnowledgePanel({ zoneSlug, categories }: ZoneKnowledgePanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          <span className={styles.headingIcon} aria-hidden>
            <IconLayers />
          </span>
          Approche
        </h2>
        <Link href={`/zones/${zoneSlug}/approche`} className={styles.seeAll}>
          Voir tout →
        </Link>
      </div>
      <p className={styles.subtitle}>Données clés et contexte régional</p>

      {categories && categories.length > 0 ? (
        <div className={styles.list}>
          {categories.map((cat) => (
            // Thematic sub-pages don't exist yet — these rows are
            // intentionally not links (see product decision: build the
            // list first, wire up real destinations once those pages
            // exist rather than pointing every row at the generic
            // Approche/PDF route).
            <div key={cat.key} className={styles.item}>
              <span className={styles.itemIcon}>
                <ZoneCategoryIcon categoryKey={cat.key} />
              </span>
              <div className={styles.itemText}>
                <span className={styles.itemTitle}>{cat.title}</span>
                <span className={styles.itemDescription}>{cat.description}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Contenu en cours de rédaction pour cette zone.</p>
      )}
    </div>
  );
}

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}
