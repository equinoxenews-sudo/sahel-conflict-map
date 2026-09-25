import type { ZoneApprocheContent } from "@/lib/zoneApprocheContent";
import ApprocheCategoryIcon from "./ApprocheCategoryIcon";
import SouthAmericaMap from "./SouthAmericaMap";
import styles from "./ZoneApprochePage.module.css";

interface ZoneApprochePageProps {
  content: ZoneApprocheContent;
}

function MapPanelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function DocumentPanelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3.5h8l4 4V20.5H6z" />
      <path d="M14 3.5V7.5h4M9 12h6M9 15.5h6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function ZoneApprochePage({ content }: ZoneApprochePageProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <div>
          <h2 className={styles.introTitle}>Comprendre la région</h2>
          <p className={styles.introSubtitle}>Fiches pays, repères et dossiers de fond</p>
        </div>
        <label className={styles.searchBox}>
          <SearchIcon />
          <input type="search" placeholder="Rechercher un pays ou un thème" disabled />
        </label>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelHeading}>
              <span className={styles.panelIcon}>
                <MapPanelIcon />
              </span>
              Pays &amp; territoires
            </h3>
            <span className={styles.seeAll}>Voir tout →</span>
          </div>
          <SouthAmericaMap />
        </div>

        <div className={styles.categoryGrid}>
          {content.categories.map((category) => (
            <button key={category.key} type="button" className={styles.categoryCard}>
              <span className={styles.categoryIcon}>
                <ApprocheCategoryIcon categoryKey={category.key} />
              </span>
              <span className={styles.categoryTitle}>{category.title}</span>
              <span className={styles.categoryDescription}>{category.description}</span>
              <span className={styles.categoryArrow}>→</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.dossiersSection}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelHeading}>
            <span className={styles.panelIcon}>
              <DocumentPanelIcon />
            </span>
            Dossiers transversaux
          </h3>
          <span className={styles.seeAll}>Voir tout →</span>
        </div>

        <div className={styles.dossiersGrid}>
          {content.dossiers.map((dossier) => (
            <button key={dossier.slug} type="button" className={styles.dossierCard}>
              <span className={styles.dossierImage} style={{ background: dossier.gradient }} aria-hidden />
              <span className={styles.dossierBody}>
                <span className={styles.dossierTitle}>{dossier.title}</span>
                <span className={styles.dossierDescription}>{dossier.description}</span>
                <span className={styles.categoryArrow}>→</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <span>Sources documentées • Date de mise à jour sur chaque fiche</span>
        <span>Maquette proposée</span>
      </div>
    </div>
  );
}
