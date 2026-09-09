import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/equinoxe/Header";
import { formatDate } from "@/lib/formatDate";
import { computeBriefReliability, RELIABILITY_COLORS } from "@/lib/reliability";
import { supabase } from "@/lib/supabaseClient";
import { getZone } from "@/lib/zones";
import type { ZoneBrief } from "@/types/brief";
import styles from "./page.module.css";

export const revalidate = 3600;

async function getBrief(id: string): Promise<ZoneBrief | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;

  try {
    const { data, error } = await supabase
      .from("zone_briefs")
      .select(
        "id, zone_slug, title, summary, sections, source_urls, source_domains, image_url, published_at"
      )
      .eq("id", numericId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load brief:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return null;
  }
}

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brief = await getBrief(id);
  if (!brief) notFound();

  const zone = getZone(brief.zone_slug);
  const uniqueDomains = [...new Set(brief.source_domains)];
  const reliability = computeBriefReliability(brief.source_domains);

  // Sources aligned 1:1 with source_urls (see lib/synthesizeBriefs.ts) —
  // group them per domain so each outlet is listed once with all its URLs.
  const sourcesByDomain = new Map<string, string[]>();
  brief.source_urls.forEach((url, i) => {
    const domain = brief.source_domains[i] ?? url;
    sourcesByDomain.set(domain, [...(sourcesByDomain.get(domain) ?? []), url]);
  });

  return (
    <main className={styles.main}>
      <Header />

      <div className={styles.topBar}>
        <Link href={zone ? `/zones/${zone.slug}/actualite` : "/"} className={styles.back}>
          &lsaquo; Retour {zone ? `— ${zone.name}` : ""}
        </Link>
      </div>

      <article className={styles.article}>
        {brief.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brief.image_url} alt="" className={styles.image} />
        ) : null}

        <div className={styles.meta}>
          <span className={styles.date}>{formatDate(brief.published_at)}</span>
          <span className={styles.reliability}>
            <span
              className={styles.reliabilityBadge}
              style={{ backgroundColor: RELIABILITY_COLORS[reliability] }}
            >
              {reliability}
            </span>
            Score de fiabilité — {uniqueDomains.length} source{uniqueDomains.length > 1 ? "s" : ""}{" "}
            indépendante{uniqueDomains.length > 1 ? "s" : ""}
          </span>
        </div>

        <h1 className={styles.title}>{brief.title}</h1>

        <div className={styles.body}>
          {brief.sections && brief.sections.length > 0
            ? brief.sections.map((section, i) => (
                <section key={i} className={styles.section}>
                  {section.heading ? <h2 className={styles.sectionHeading}>{section.heading}</h2> : null}
                  {section.body.split("\n\n").map((paragraph, j) => (
                    <p key={j} className={styles.paragraph}>
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))
            : // Briefs created before the sections column existed.
              <p className={styles.paragraph}>{brief.summary}</p>}
        </div>

        <section className={styles.sources}>
          <h2 className={styles.sourcesHeading}>Sources</h2>
          <ul className={styles.sourcesList}>
            {[...sourcesByDomain.entries()].map(([domain, urls]) => (
              <li key={domain} className={styles.sourceItem}>
                <span className={styles.sourceDomain}>{domain}</span>
                {urls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                    Article {urls.length > 1 ? i + 1 : ""} &rsaquo;
                  </a>
                ))}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
