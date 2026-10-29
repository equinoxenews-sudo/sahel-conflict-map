import type { ReactNode } from "react";
import { containsDemo } from "@/lib/approche/demo";
import type { Item, Kpi } from "@/lib/approche/modules";
import type { MetricView, SourceView } from "@/lib/approche/view";
import { DemoTag } from "./DemoBanner";
import Detail from "./Detail";
import MetricCard from "./MetricCard";
import styles from "./Approche.module.css";

export type SourceMap = Record<string, SourceView>;

/** Titre de section avec l'indicateur discret « démo » quand le contenu l'est. */
export function SectionHeading({ id, children, data }: { id: string; children: ReactNode; data?: unknown }) {
  return (
    <h2 id={id} className={styles.sectionTitle}>
      {children} <DemoTag show={containsDemo(data)} />
    </h2>
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

/** Carte cliquable d'un élément éditorial : titre, résumé, étiquettes ; le détail et les sources s'ouvrent au clic. */
export function ItemCard({ item, sources, extra, className }: { item: Item; sources: SourceMap; extra?: ReactNode; className?: string }) {
  return (
    <Detail
      title={item.title}
      className={className ?? styles.itemCard}
      trigger={
        <>
          <span className={styles.itemTitle}>
            {item.title}
          </span>
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
