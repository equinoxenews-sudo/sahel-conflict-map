import type { MetricView } from "@/lib/approche/view";
import styles from "./Approche.module.css";

// Contenu du tiroir de provenance d'une valeur : période, périmètre, méthode, sources avec licence, autres mesures du même sujet.
// Partagé par les tuiles de chiffres (MetricCard) et les badges d'organisations (OrgBadge).
export default function MetricDrawerBody({ metric, shown }: { metric: MetricView; shown?: string }) {
  return (
    <>
      <p className={styles.drawerValue}>
        {shown ?? metric.value} {metric.unit}
      </p>
      <dl className={styles.drawerFacts}>
        <dt>Période</dt>
        <dd>{metric.period}</dd>
        <dt>Périmètre</dt>
        <dd>{metric.scope}</dd>
        <dt>Nature</dt>
        <dd>{metric.kind}</dd>
        {metric.validFrom ? (
          <>
            <dt>En fonction depuis</dt>
            <dd>{metric.validFrom}</dd>
          </>
        ) : null}
        <dt>Dernière vérification</dt>
        <dd>{metric.verifiedAt}</dd>
      </dl>
      <h4>Méthode</h4>
      <p>{metric.methodology}</p>
      {metric.uncertainty ? (
        <>
          <h4>Incertitude</h4>
          <p>{metric.uncertainty}</p>
        </>
      ) : null}
      <h4>Source{metric.sources.length > 1 ? "s" : ""}</h4>
      <ul className={styles.drawerSources}>
        {metric.sources.map((source) => (
          <li key={source.id}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title}
            </a>
            <span>
              {source.publisher}
              {source.publishedAt ? ` · publiée le ${source.publishedAt}` : ""} · consultée le {source.accessedAt}
            </span>
            <span className={source.reuse === "allowed" ? styles.licenceOk : styles.licenceWarn}>
              {source.reuse === "unknown" ? "Licence de réutilisation non vérifiée" : source.license}
              {source.licenseUrl ? (
                <>
                  {" · "}
                  <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
                    conditions
                  </a>
                </>
              ) : null}
            </span>
            {source.notes ? <span className={styles.sourceNotes}>{source.notes}</span> : null}
          </li>
        ))}
      </ul>
      {metric.others.length > 0 ? (
        <>
          <h4>Autres sources sur ce sujet</h4>
          <ul className={styles.drawerOthers}>
            {metric.others.map((other) => (
              <li key={`${other.publisher}-${other.period}-${other.value}`}>
                <strong>
                  {other.label ? `${other.label} : ` : ""}
                  {other.value} {other.unit}
                </strong>
                <span>
                  {other.publisher} · période {other.period} · périmètre : {other.scope}
                </span>
                <span>
                  {other.kind}
                  {other.gapPercent ? ` · écart de ${other.gapPercent} % avec la valeur ci-dessus (même période, même périmètre, même unité)` : ""}
                </span>
                <span>Méthode : {other.methodology}</span>
                {other.uncertainty ? <span>Incertitude : {other.uncertainty}</span> : null}
                {other.sourceUrl ? (
                  <a href={other.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {other.sourceTitle || "Source"}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <p className={styles.drawerNote}>
            Ces mesures ont des définitions, des dates ou des périmètres différents : aucune n&apos;est présentée comme la bonne, elles ne sont ni additionnées ni moyennées, et un écart n&apos;est chiffré que lorsque les deux mesures sont comparables.
          </p>
        </>
      ) : null}
    </>
  );
}
