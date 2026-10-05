import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import Header from "@/components/equinoxe/Header";
import { formatDate } from "@/lib/formatDate";
import { supabase } from "@/lib/supabaseClient";
import { eventTypeLabel, importanceLabel, resolveEventType, resolveTheme, themeLabel } from "@/lib/themes";
import { isValidVeracity, VERACITY_COLORS } from "@/lib/veracity";
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
        "id, zone_slug, title, category, primary_theme, secondary_themes, event_type, importance, veracity, summary, sections, source_urls, source_domains, image_url, published_at, updated_at"
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
  const veracity = isValidVeracity(brief.veracity) ? brief.veracity : null;
  const primaryTheme = resolveTheme(brief);
  const eventType = resolveEventType(brief);
  const tags = [
    ...(primaryTheme ? [{ key: primaryTheme, label: themeLabel(primaryTheme), primary: true }] : []),
    ...(brief.secondary_themes ?? []).map((t) => ({ key: t, label: themeLabel(t), primary: false })),
  ];

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
        <BackLink fallbackHref={zone ? `/zones/${zone.slug}/actualite` : "/"} className={styles.back}>
          &lsaquo; Retour
        </BackLink>
      </div>

      <article className={styles.article}>
        {brief.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brief.image_url} alt="" className={styles.image} />
        ) : null}

        <div className={styles.meta}>
          <span className={styles.date}>Première synthèse : {formatDate(brief.published_at)}{brief.updated_at ? ` · Mise à jour : ${formatDate(brief.updated_at)}` : ""}</span>
          <span
            className={styles.veracityBadge}
            style={{ backgroundColor: veracity ? VERACITY_COLORS[veracity] : "#8b96a5" }}
          >
            {veracity ?? "Non évalué"}
          </span>
        </div>

        {tags.length > 0 || eventType || brief.importance ? (
          <div className={styles.tags}>
            {tags.map((tag) => (
              <span key={tag.key} className={tag.primary ? styles.tagPrimary : styles.tag}>
                {tag.label}
              </span>
            ))}
            {eventType ? <span className={styles.tag}>{eventTypeLabel(eventType)}</span> : null}
            {brief.importance ? <span className={styles.tag}>Importance {importanceLabel(brief.importance)}</span> : null}
          </div>
        ) : null}

        {brief.image_url?.startsWith("/equinoxe/hero-") ? <p>Illustration de la zone — ne représente pas l’événement.</p> : null}
        <h1 className={styles.title}>{brief.title}</h1>
        <p>Synthèse générée par IA à partir des sources ci-dessous. Le statut de véracité est une appréciation éditoriale à la date de rédaction, pas une certification. La date affichée est celle de la synthèse.</p>

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
