import Link from "next/link";
import { notFound } from "next/navigation";
import AnalyseFrame from "@/components/situation/AnalyseFrame";
import { getPublishedArticles } from "@/lib/premiumArticles";
import { getZone } from "@/lib/zones";
import styles from "./page.module.css";

export const revalidate = 300;

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export default async function PremiumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const zone = getZone(slug);
  if (!zone || !zone.active || zone.countries.length === 0) notFound();

  const articles = await getPublishedArticles(zone.slug);

  return (
    <AnalyseFrame zoneName={zone.name} section="Articles premium" backHref={`/zones/${zone.slug}/analyse`}>
      {articles.length === 0 ? (
        <p className={styles.empty}>Les articles premium arrivent bientôt.</p>
      ) : (
        <ul className={styles.list}>
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/zones/${zone.slug}/analyse/premium/${a.id}`} className={styles.card}>
                <span className={styles.cardMeta}>
                  {a.published_at ? dayFormat.format(new Date(a.published_at)) : ""}
                  {a.author_name ? ` · ${a.author_name}` : ""}
                </span>
                <span className={styles.cardTitle}>{a.title}</span>
                {a.summary && <span className={styles.cardSummary}>{a.summary}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AnalyseFrame>
  );
}
