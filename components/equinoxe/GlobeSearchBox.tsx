import styles from "./GlobeSearchBox.module.css";

// Visual only for now — no search logic wired up yet.
export default function GlobeSearchBox() {
  return (
    <div className={styles.box}>
      <span className={styles.icon} aria-hidden>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="search"
        className={styles.input}
        placeholder="Rechercher un pays, une ville, un événement..."
        disabled
      />
      <span className={styles.shortcut}>/</span>
    </div>
  );
}
