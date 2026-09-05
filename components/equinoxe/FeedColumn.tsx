import styles from "./FeedColumn.module.css";

export default function FeedColumn() {
  return (
    <div className={styles.column}>
      <h2 className={styles.heading}>Feed</h2>
      <div className={styles.placeholder}>
        <p>Contenu à déterminer</p>
      </div>
    </div>
  );
}
