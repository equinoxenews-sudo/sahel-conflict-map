import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import ConfidenceBar from "@/components/ConfidenceBar";
import Header from "@/components/equinoxe/Header";
import { formatDate } from "@/lib/formatDate";
import { supabase } from "@/lib/supabaseClient";
import { BRIEF_TAG_COLUMN, BRIEF_V2_COLUMNS } from "@/lib/zoneBriefs";
import HexFlag from "@/components/investigation/HexFlag";
import { globeCountryInfo } from "@/lib/globeCountry";
import { countryNameOf, iso2Of } from "@/lib/countryTags";
import { eventTypeLabel, importanceLabel, resolveEventType, resolveTheme, themeLabel } from "@/lib/themes";
import { isValidVeracity, VERACITY_COLORS } from "@/lib/veracity";
import { getZone } from "@/lib/zones";
import type { ZoneBrief } from "@/types/brief";
import styles from "./page.module.css";
import { briefImageSrc } from "@/lib/imageUrls";

export const revalidate = 3600;

async function getBrief(id: string): Promise<ZoneBrief | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;

  try {
    const columns =
      "id, zone_slug, title, category, primary_theme, secondary_themes, event_type, importance, veracity, summary, sections, source_urls, source_domains, image_url, published_at, updated_at";
    const load = (cols: string) => supabase.from("zone_briefs").select(cols).eq("id", numericId).maybeSingle();
    // Colonnes V2 (indice de confiance, lieu) si la migration est passée, sinon sans elles.
    let { data, error } = await load(`${columns}, ${BRIEF_V2_COLUMNS}, ${BRIEF_TAG_COLUMN}`);
    if (error) ({ data, error } = await load(`${columns}, ${BRIEF_V2_COLUMNS}`));
    if (error) ({ data, error } = await load(columns));

    if (error) {
      console.error("Failed to load brief:", error.message);
      return null;
    }

    return data as unknown as ZoneBrief | null;
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

  // Pays dont l'article traite (tags posés à la rédaction), avec le lien vers leur fiche Approche quand elle existe.
  const countryTags = (brief.countries ?? []).flatMap((iso3) => {
    const name = countryNameOf(iso3);
    return name ? [{ iso3, name, iso2: iso2Of(iso3), href: globeCountryInfo(iso3, name).href }] : [];
  });

  return (
    <main className={styles.main}>
      <Header />

      <div className={styles.topBar}>
        <BackLink fallbackHref={zone ? `/zones/${zone.slug}/actualite` : "/"} className={styles.back}>
          &lsaquo; Retour
        </BackLink>
      </div>

      <article className={styles.article} lang="fr">
        {brief.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={briefImageSrc(brief.image_url)} referrerPolicy="no-referrer" alt="" className={styles.image} />
        ) : null}

        <div className={styles.meta}>
          <span className={styles.date}>Première synthèse : {formatDate(brief.published_at)}{brief.updated_at ? ` · Mise à jour : ${formatDate(brief.updated_at)}` : ""}</span>
          {brief.confidence == null ? (
            <span
              className={styles.veracityBadge}
              style={{ backgroundColor: veracity ? VERACITY_COLORS[veracity] : "#8b96a5" }}
            >
              {veracity ?? "Non évalué"}
            </span>
          ) : null}
        </div>

        {brief.confidence != null && brief.confidence_label ? (
          <div className={styles.confidence}>
            <ConfidenceBar
              percent={brief.confidence}
              label={brief.confidence_label}
              sourceCount={brief.source_count ?? brief.source_urls.length}
              claimedBy={brief.claimed_by}
            />
            {brief.place_name ? (
              <p className={styles.place}>
                📍 {brief.place_name}
                {brief.place_country && brief.place_country !== brief.place_name ? `, ${brief.place_country}` : ""}
                {brief.geo_precision === "capitale" ? " (information d’ordre national)" : ""}
              </p>
            ) : null}
          </div>
        ) : null}

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

        {countryTags.length > 0 ? (
          <section className={styles.sources}>
            <h2 className={styles.sourcesHeading}>Tags</h2>
            <ul className={styles.countryTags}>
              {countryTags.map((tag) => (
                <li key={tag.iso3}>
                  {tag.href ? (
                    <Link href={tag.href} className={styles.countryTag}>
                      {tag.iso2 ? <HexFlag iso2={tag.iso2} name={tag.name} /> : null}
                      {tag.name}
                    </Link>
                  ) : (
                    <span className={styles.countryTag}>
                      {tag.iso2 ? <HexFlag iso2={tag.iso2} name={tag.name} /> : null}
                      {tag.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
