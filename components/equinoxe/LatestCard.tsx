import Link from "next/link";
import styles from "./LatestCard.module.css";

interface LatestCardProps {
  title: string;
  date: string | null;
  href: string;
  imageUrl?: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default function LatestCard({ title, date, href, imageUrl }: LatestCardProps) {
  return (
    <Link href={href} className={styles.card}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className={styles.image} />
      ) : null}
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.badge}>LATEST</span>
          {date ? <span className={styles.time}>{formatTime(date)}</span> : null}
        </div>
        <span className={styles.title}>{title}</span>
      </div>
      <span className={styles.chevron} aria-hidden>
        ›
      </span>
    </Link>
  );
}
