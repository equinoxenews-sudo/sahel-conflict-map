import { Children, type ReactNode } from "react";
import { containsDemo } from "@/lib/approche/demo";
import { displayable } from "@/lib/approche/media";
import { iconForMetric } from "@/lib/approche/metricIcons";
import type { Item, Kpi } from "@/lib/approche/modules";
import type { MetricView, SourceView } from "@/lib/approche/view";
import { DemoTag } from "./DemoBanner";
import Detail from "./Detail";
import Icon from "./Icon";
import MetricCard from "./MetricCard";
import TimelineScroll from "./TimelineScroll";
import Visual, { type MediaMap } from "./Visual";
import styles from "./Approche.module.css";

export type SourceMap = Record<string, SourceView>;

/** Titre de section avec pictogramme et l'indicateur discret « démo » quand le contenu l'est. */
export function SectionHeading({ id, children, data, icon }: { id: string; children: ReactNode; data?: unknown; icon?: string }) {
  return (
    <h2 id={id} className={styles.sectionTitle}>
      {icon ? <Icon name={icon} size={20} /> : null}
      <span>{children}</span> <DemoTag show={containsDemo(data)} />
    </h2>
  );
}

/**
 * Grille des chiffres clés, commune aux six onglets. La disposition suit la largeur de la grille (pas celle de l'écran) et le
 * nombre de tuiles : 6 → 3×2, 5 → 3+2 sur une rangée équilibrée, 4 → 2×2 (4×1 en très large), 3 → 3×1 ; jamais une tuile orpheline.
 */
export function KpiGrid({ children, compact = false }: { children: ReactNode; /** Bandeau de repères sur une ligne (peu de tuiles, décomptes éditoriaux) plutôt que de grandes tuiles. */ compact?: boolean }) {
  const cells = Children.toArray(children);
  return (
    <div className={compact ? `${styles.kpiGrid} ${styles.kpiCompact}` : styles.kpiGrid}>
      <div className={styles.kpiInner} data-count={cells.length}>
        {cells.map((cell, index) => (
          <div key={index} className={styles.kpiCell}>
            {cell}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sources d'un élément, ou la mention explicite qu'il n'en a pas (démonstration). */
export function SourceList({ ids, sources, demo }: { ids: string[]; sources: SourceMap; demo?: boolean }) {
  const found = ids.flatMap((id) => (sources[id] ? [sources[id]] : []));
  if (found.length === 0) {
    return <p className={styles.cardNote}>{demo ? "Contenu de démonstration : aucune source. En version réelle, chaque élément cite ses sources, leur date et leur licence." : "Aucune source renseignée."}</p>;
  }
  return (
    <>
      <h4>Source{found.length > 1 ? "s" : ""}</h4>
      <ul className={styles.drawerSources}>
        {found.map((source) => (
          <li key={source.id}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title}
            </a>
            <span>
              {source.publisher} · consultée le {source.accessedAt}
            </span>
            <span className={source.reuse === "allowed" ? styles.licenceOk : styles.licenceWarn}>{source.reuse === "unknown" ? "Licence de réutilisation non vérifiée" : source.license}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Pictogramme teinté d'une carte sans photographie : remplace le grand cadre dégradé vide. */
export function CardBadge({ icon, hue = 215 }: { icon: string; hue?: number }) {
  return (
    <span className={styles.cardBadge} style={{ background: `hsl(${hue} 38% 17%)`, color: `hsl(${hue} 75% 72%)`, borderColor: `hsl(${hue} 40% 28%)` }} aria-hidden>
      <Icon name={icon} size={22} />
    </span>
  );
}

export interface VisualOptions {
  media: MediaMap;
  demoActive: boolean;
  icon: string;
  hue?: number;
}

/** Carte cliquable d'un élément éditorial : (image), titre, résumé, étiquettes ; le détail et les sources s'ouvrent au clic. */
export function ItemCard({ item, sources, extra, className, visual }: { item: Item; sources: SourceMap; extra?: ReactNode; className?: string; visual?: VisualOptions }) {
  const asset = visual && item.imageId ? visual.media[item.imageId] : null;
  // Sans photographie autorisée : pas de grand cadre vide, un pictogramme teinté en tête de carte (mêmes dimensions, même alignement).
  const hasImage = Boolean(visual && displayable(asset, visual.demoActive));
  const compact = Boolean(visual) && !hasImage;
  return (
    <Detail
      title={item.title}
      className={className ?? (visual ? (compact ? `${styles.mediaCard} ${styles.mediaCardCompact}` : styles.mediaCard) : styles.itemCard)}
      trigger={
        <>
          {visual && hasImage ? <Visual asset={asset} demoActive={visual.demoActive} icon={visual.icon} hue={visual.hue} className={styles.mediaCardImage} sizes="(max-width: 860px) 100vw, 25vw" /> : null}
          {visual && compact ? <CardBadge icon={visual.icon} hue={visual.hue} /> : null}
          <span className={visual ? styles.mediaCardBody : styles.itemBody}>
            <span className={styles.itemTitle}>{item.title}</span>
            {item.summary ? <span className={styles.itemSummary}>{item.summary}</span> : null}
            {item.date || item.status ? <span className={styles.itemMeta}>{[item.date, item.status].filter(Boolean).join(" · ")}</span> : null}
            {item.tags.length > 0 ? (
              <span className={styles.tagRow}>
                {item.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </span>
            ) : null}
            {visual ? <span className={styles.sourceHint}>Voir le détail ›</span> : null}
          </span>
        </>
      }
    >
      {item.summary ? <p>{item.summary}</p> : null}
      {extra}
      {item.url ? (
        <p>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            Page officielle
          </a>
        </p>
      ) : null}
      <SourceList ids={item.sourceIds} sources={sources} demo={item.demo} />
    </Detail>
  );
}

/** Ligne d'une liste (atout, risque, mission…) avec pictogramme : un clic ouvre le détail et les sources. */
export function IconRow({ item, sources, icon, tone }: { item: Item; sources: SourceMap; icon: string; tone?: "good" | "warn" | "bad" | "info" }) {
  return (
    <Detail
      title={item.title}
      className={styles.iconRow}
      trigger={
        <>
          <span className={`${styles.iconBubble} ${tone ? styles[`tone_${tone}`] : ""}`}>
            <Icon name={icon} size={15} />
          </span>
          <span className={styles.iconRowText}>
            <span className={styles.itemTitle}>{item.title}</span>
            {item.summary ? <span className={styles.itemSummary}>{item.summary}</span> : null}
          </span>
        </>
      }
    >
      {item.summary ? <p>{item.summary}</p> : null}
      <SourceList ids={item.sourceIds} sources={sources} demo={item.demo} />
    </Detail>
  );
}

const STATUS_CLASS: Record<string, string> = { "réalisé": "statusDone", "en cours": "statusNow", "annoncé": "statusAnnounced", "prévu": "statusPlanned" };

/**
 * Chronologie graphique : axe horizontal sur ordinateur, vertical sur mobile ; chaque jalon ouvre son détail et ses sources.
 * Un jalon futur porte son statut (« annoncé », « prévu ») et n'est jamais présenté comme un fait.
 */
export function Timeline({ items, sources }: { items: Item[]; sources: SourceMap }) {
  return (
    <TimelineScroll>
      {items.map((entry) => (
        <li key={entry.id} className={styles.tlItem}>
          <span className={styles.tlDot} aria-hidden />
          <span className={styles.tlDate}>{entry.date}</span>
          <Detail
            title={entry.title}
            className={styles.tlCard}
            trigger={
              <>
                <span className={styles.itemTitle}>{entry.title}</span>
                {entry.summary ? <span className={styles.itemSummary}>{entry.summary}</span> : null}
                {entry.status ? <span className={`${styles.status} ${styles[STATUS_CLASS[entry.status] ?? "statusPlanned"]}`}>{entry.status}</span> : null}
              </>
            }
          >
            {entry.date ? <p className={styles.cardNote}>{entry.date}{entry.status ? ` · ${entry.status}` : ""}</p> : null}
            {entry.summary ? <p>{entry.summary}</p> : null}
            <SourceList ids={entry.sourceIds} sources={sources} demo={entry.demo} />
          </Detail>
        </li>
      ))}
    </TimelineScroll>
  );
}

/** Tuile de chiffre clé d'un module : renvoie à l'observation sourcée quand elle existe, sinon affiche le texte déclaré. */
export function KpiTile({ kpi, metrics, sources }: { kpi: Kpi; metrics: Map<string, MetricView>; sources: SourceMap }) {
  const metric = kpi.observationKey ? (metrics.get(kpi.observationKey) ?? null) : null;
  if (metric) return <MetricCard label={kpi.label} metric={metric} />;
  if (!kpi.valueText) return <MetricCard label={kpi.label} metric={null} />;
  return (
    <Detail
      title={kpi.label}
      className={styles.tile}
      trigger={
        <>
          <span className={styles.tileLabel}>
            <Icon name={iconForMetric(kpi.label)} size={15} />
            {kpi.label}
          </span>
          <span className={styles.tileValue}>
            {kpi.valueText}
            {kpi.unit ? <small> {kpi.unit}</small> : null}
          </span>
          <span className={styles.tileMeta}>{kpi.period ? <span className={styles.period}>{kpi.period}</span> : null}</span>
        </>
      }
    >
      <p className={styles.drawerValue}>
        {kpi.valueText} {kpi.unit}
      </p>
      {kpi.note ? <p>{kpi.note}</p> : null}
      <SourceList ids={kpi.sourceIds} sources={sources} demo={kpi.demo} />
    </Detail>
  );
}
