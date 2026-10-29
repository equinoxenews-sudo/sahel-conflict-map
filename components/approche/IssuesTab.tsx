import type { IssuesModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import Detail from "./Detail";
import { ItemCard, KpiTile, SectionHeading, SourceList, type SourceMap } from "./shared";
import styles from "./Approche.module.css";

interface IssuesTabProps {
  issues: IssuesModule;
  metrics: Map<string, MetricView>;
  sources: SourceMap;
}

const SCOPE_LABELS = { national: "National", european: "Européen", international: "International" } as const;

const STATUS_CLASS: Record<string, string> = { réalisé: "statusDone", prévu: "statusPlanned", annoncé: "statusAnnounced" };

export default function IssuesTab({ issues, metrics, sources }: IssuesTabProps) {
  if (!issues.issues.length && !issues.calendar.length && !issues.map) {
    return (
      <section className={styles.card}>
        <h2>Enjeux stratégiques</h2>
        <p className={styles.cardNote}>Aucun dossier n&apos;est publié pour ce pays pour l&apos;instant.</p>
      </section>
    );
  }

  return (
    <div className={styles.tabBody}>
      {issues.kpis.length > 0 ? (
        <div className={styles.tiles}>
          {issues.kpis.map((kpi) => (
            <KpiTile key={kpi.id} kpi={kpi} metrics={metrics} sources={sources} />
          ))}
        </div>
      ) : null}

      {issues.issues.length > 0 ? (
        <section aria-labelledby="issues-title">
          <SectionHeading id="issues-title" data={issues.issues}>
            Les {issues.issues.length} dossiers stratégiques
          </SectionHeading>
          <p className={styles.cardNote}>Ces dossiers sont des choix éditoriaux, révisables : leur ordre n&apos;est pas un classement objectif et « {issues.issues.length} » est un nombre de dossiers, pas un score.</p>
          <div className={styles.issueGrid}>
            {issues.issues.map((issue, index) => (
              <Detail
                key={issue.id}
                title={issue.title}
                className={styles.issueCard}
                trigger={
                  <>
                    <span className={styles.issueNumber}>{index + 1}</span>
                    <span className={styles.itemTitle}>
                      {issue.title}
                    </span>
                    <span className={styles.tagRow}>
                      {issue.tags.map((tag) => (
                        <span key={tag} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </span>
                    <span className={styles.itemSummary}>{issue.summary}</span>
                    {issue.scope.length > 0 ? (
                      <span className={styles.tagRow} aria-label="Portée">
                        {issue.scope.map((scope) => (
                          <span key={scope} className={`${styles.tag} ${styles.tagScope}`}>
                            {SCOPE_LABELS[scope]}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    {issue.horizon ? <span className={styles.itemMeta}>Horizon : {issue.horizon}</span> : null}
                    <span className={styles.sourceHint}>Voir le dossier ›</span>
                  </>
                }
              >
                <p>{issue.summary}</p>
                <h4>Situation actuelle</h4>
                <p>{issue.situation || "À renseigner avec des faits sourcés."}</p>
                <h4>Pourquoi c&apos;est stratégique (analyse)</h4>
                <p>{issue.whyStrategic || "À renseigner : analyse attribuée et datée."}</p>
                {issue.subthemes.length > 0 ? (
                  <>
                    <h4>Sous-thèmes</h4>
                    <ul className={styles.bullets}>
                      {issue.subthemes.map((theme) => (
                        <li key={theme}>{theme}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {issue.actors.length > 0 ? (
                  <>
                    <h4>Acteurs concernés</h4>
                    <p>{issue.actors.join(" · ")}</p>
                  </>
                ) : null}
                {issue.indicators.length > 0 ? (
                  <>
                    <h4>Indicateurs de suivi</h4>
                    <ul className={styles.bullets}>
                      {issue.indicators.map((indicator) => (
                        <li key={indicator}>{indicator}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {issue.uncertainties.length > 0 ? (
                  <>
                    <h4>Hypothèses et incertitudes</h4>
                    <ul className={styles.bullets}>
                      {issue.uncertainties.map((uncertainty) => (
                        <li key={uncertainty}>{uncertainty}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <SourceList ids={issue.sourceIds} sources={sources} demo={issue.demo} />
              </Detail>
            ))}
          </div>
        </section>
      ) : null}

      {issues.map ? (
        <section className={styles.card} aria-labelledby="interest-title">
          <SectionHeading id="interest-title" data={issues.map}>
            Carte des intérêts stratégiques
          </SectionHeading>
          <ApprocheMap map={issues.map} sources={sources} />
        </section>
      ) : null}

      {issues.calendar.length > 0 ? (
        <section className={styles.card} aria-labelledby="calendar-title">
          <SectionHeading id="calendar-title" data={issues.calendar}>
            Calendrier des échéances
          </SectionHeading>
          <ol className={styles.timeline}>
            {issues.calendar.map((entry) => (
              <li key={entry.id}>
                <span className={styles.timelineDate}>{entry.date}</span>
                <ItemCard item={{ ...entry, date: null, status: null }} sources={sources} className={styles.listButton} />
                {entry.status ? <span className={`${styles.status} ${styles[STATUS_CLASS[entry.status] ?? "statusPlanned"]}`}>{entry.status}</span> : null}
              </li>
            ))}
          </ol>
          <p className={styles.cardNote}>Une échéance future est « prévue » ou « annoncée » avec sa source officielle ; seule une échéance passée est « réalisée ».</p>
        </section>
      ) : null}

      <div className={styles.twoCols}>
        {issues.opportunities.length > 0 ? (
          <section className={styles.card} aria-labelledby="opp-title">
            <SectionHeading id="opp-title" data={issues.opportunities}>
              Opportunités
            </SectionHeading>
            <ul className={styles.plainList}>
              {issues.opportunities.map((entry) => (
                <li key={entry.id}>
                  <ItemCard item={{ ...entry, summary: "" }} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ul>
            <p className={styles.cardNote}>Les opportunités sont des possibilités, non des événements futurs assurés.</p>
          </section>
        ) : null}
        {issues.risks.length > 0 ? (
          <section className={styles.card} aria-labelledby="risk-title">
            <SectionHeading id="risk-title" data={issues.risks}>
              Risques et menaces
            </SectionHeading>
            <ul className={styles.plainList}>
              {issues.risks.map((entry) => (
                <li key={entry.id}>
                  <ItemCard item={{ ...entry, summary: "" }} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ul>
            <p className={styles.cardNote}>Aucune probabilité ni gravité chiffrée : chaque risque se rattache à un fait daté et sourcé.</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
