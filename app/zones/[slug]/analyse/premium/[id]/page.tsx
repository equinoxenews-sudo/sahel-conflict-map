import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AnalyseFrame from "@/components/situation/AnalyseFrame";
import { parseImage } from "@/lib/articleBlocks";
import { Markdown } from "@/lib/markdown";
import { getArticlePreview, getPublishedArticle, readingMinutes, type PremiumArticle } from "@/lib/premiumArticles";
import { getZone } from "@/lib/zones";
import styles from "./page.module.css";

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ apercu?: string | string[] }>;
};

async function load({ params, searchParams }: Props): Promise<{ article: PremiumArticle; preview: boolean } | null> {
  const [{ slug, id }, query] = await Promise.all([params, searchParams]);
  const zone = getZone(slug);
  const articleId = Number(id);
  if (!zone || !zone.active || !Number.isInteger(articleId) || articleId <= 0) return null;
  const token = typeof query.apercu === "string" ? query.apercu : null;
  if (token) {
    const article = await getArticlePreview(zone.slug, articleId, token);
    return article ? { article, preview: true } : null;
  }
  const article = await getPublishedArticle(zone.slug, articleId);
  return article ? { article, preview: false } : null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const found = await load(props);
  if (!found) return {};
  return {
    title: `${found.article.title} — Équinoxe`,
    description: found.article.summary ?? undefined,
    // Un aperçu n'est jamais indexé.
    robots: found.preview ? { index: false, follow: false } : undefined,
  };
}

export default async function PremiumArticlePage(props: Props) {
  const found = await load(props);
  if (!found) notFound();
  const { article, preview } = found;
  const zone = getZone(article.zone_slug)!;
  const date = article.published_at ?? article.updated_at;
  // Image de présentation : la première image du texte, si elle ouvre l'article.
  const firstLine = article.body_md.trimStart().split("\n")[0] ?? "";
  const cover = parseImage(firstLine);
  const body = cover ? article.body_md.trimStart().slice(firstLine.length) : article.body_md;

  return (
    <AnalyseFrame zoneName={zone.name} section="Articles premium" backHref={`/zones/${zone.slug}/analyse/premium`}>
      {preview && (
        <p className={styles.previewBanner}>
          {article.status === "published"
            ? "Aperçu : cet article est publié."
            : "Aperçu : brouillon non publié, visible uniquement avec ce lien."}
        </p>
      )}
      <article className={styles.article} lang="fr">
        {cover && (
          <figure className={styles.cover}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.src} alt={cover.alt} referrerPolicy="no-referrer" />
            {cover.alt && <figcaption>{cover.alt}</figcaption>}
          </figure>
        )}
        <header className={styles.header}>
          <p className={styles.meta}>
            {dayFormat.format(new Date(date))}
            {article.author_name ? ` · ${article.author_name}` : ""} · {readingMinutes(article.body_md)} min de lecture
          </p>
          <h2 className={styles.title}>{article.title}</h2>
          {article.summary && <p className={styles.summary}>{article.summary}</p>}
        </header>
        <Markdown source={body} className={styles.body} />
        <p className={styles.disclaimer}>
          Article rédigé avec l&apos;aide d&apos;une IA à partir de sources ouvertes, puis relu et validé avant publication.
          Les indices de confiance qualifient chaque fait ; les affirmations non confirmées sont attribuées à leurs sources.
        </p>
      </article>
    </AnalyseFrame>
  );
}
