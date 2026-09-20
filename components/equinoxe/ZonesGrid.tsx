import Image from "next/image";
import Link from "next/link";
import { ZONES } from "@/lib/zones";
import styles from "./ZonesGrid.module.css";

export default function ZonesGrid() {
  return (
    <div className={styles.grid}>
      {ZONES.filter((z) => z.slug !== "tracking").map((zone) => (
        <Link key={zone.slug} href={`/zones/${zone.slug}`} className={styles.zone}>
          <span className={styles.hex}>
            <Image src={zone.icon} alt={zone.name} width={56} height={69} />
          </span>
          <span className={styles.name}>{zone.name}</span>
        </Link>
      ))}
      <Link href="/zones/tracking" className={styles.zone}>
        <span className={styles.hexTracking}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="3.2" />
          </svg>
        </span>
        <span className={styles.name}>Tracking</span>
      </Link>
    </div>
  );
}
