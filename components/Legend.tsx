import { CATEGORY_COLORS } from "@/types/event";
import styles from "./Legend.module.css";

export default function Legend() {
  return (
    <div className={styles.legend}>
      {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
        <div key={category} className={styles.item}>
          <span className={styles.dot} style={{ backgroundColor: color }} />
          {category}
        </div>
      ))}
    </div>
  );
}
