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
      <h4>Source{metric.sources.length > 1 ? "s" : ""}</h4>
      <ul className={styles.drawerSources}>
        {metric.sources.map((source) => (
          <li key={source.id}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title}
            </a>
            <span>
              {source.publisher} · consultée le {source.accessedAt}
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
          <h4>Autres mesures du même sujet</h4>
          <ul className={styles.drawerOthers}>
            {metric.others.map((other) => (
              <li key={`${other.publisher}-${other.period}-${other.value}`}>
                <strong>
                  {other.value} {other.unit}
                </strong>{" "}
                · {other.publisher} · {other.period} · {other.scope}
              </li>
            ))}
          </ul>
          <p className={styles.drawerNote}>Ces mesures ont des définitions et des dates différentes : elles ne sont pas additionnées ni moyennées.</p>
        </>
      ) : null}
    </>
  );
}
