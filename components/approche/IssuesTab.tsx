import { iconForTopic } from "@/lib/approche/metricIcons";
import type { IssuesModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import Detail from "./Detail";
import Icon from "./Icon";
import { KpiTile, SectionHeading, SourceList, Timeline, type SourceMap } from "./shared";
import Visual, { type MediaMap } from "./Visual";
import styles from "./Approche.module.css";

interface IssuesTabProps {
  issues: IssuesModule;
  metrics: Map<string, MetricView>;
  sources: SourceMap;
  media: MediaMap;
  demoActive: boolean;
}

const SCOPE_LABELS = { national: "National", european: "Européen", international: "International" } as const;

function BulletBlock({ title, entries }: { title: string; entries: string[] }) {
  if (entries.length === 0) return null;
  return (
    <>
      <h4>{title}</h4>
      <ul className={styles.bullets}>
        {entries.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </>
  );
}

export default function IssuesTab({ issues, metrics, sources, media, demoActive }: IssuesTabProps) {
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
          <SectionHeading id="issues-title" data={issues.issues} icon="target">
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
                    <Visual asset={issue.imageId ? media[issue.imageId] : null} demoActive={demoActive} icon={iconForTopic(`${issue.title} ${issue.tags.join(" ")}`, "target")} hue={(index * 47 + 205) % 360} className={styles.issueImage} sizes="(max-width: 860px) 100vw, 20vw" />
                    <span className={styles.issueNumber}>{index + 1}</span>
                    <span className={styles.issueBody}>
                      <span className={styles.itemTitle}>{issue.title}</span>
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
                      {issue.horizon ? (
                        <span className={styles.itemMeta}>
                          <Icon name="clock" size={12} /> Horizon : {issue.horizon}
                        </span>
                      ) : null}
                      <span className={styles.sourceHint}>Voir le dossier ›</span>
                    </span>
                  </>
                }
              >
                <p>{issue.summary}</p>
                {issue.updatedAt ? <p className={styles.cardNote}>Actualisé le {issue.updatedAt}</p> : null}
                <h4>Contexte et situation actuelle</h4>
                <p>{issue.situation || "À renseigner avec des faits sourcés."}</p>
                <h4>Problématique : pourquoi c&apos;est stratégique (analyse)</h4>
                <p>{issue.whyStrategic || "À renseigner : analyse attribuée et datée."}</p>
                <BulletBlock title="Sous-thèmes" entries={issue.subthemes} />
                <BulletBlock title="Acteurs concernés" entries={issue.actors} />
                <BulletBlock title="Intérêts en jeu" entries={issue.interests} />
                <BulletBlock title="Évolutions récentes" entries={issue.recentDevelopments} />
                <BulletBlock title="Indicateurs à surveiller" entries={issue.indicators} />
                <BulletBlock title="Hypothèses et incertitudes" entries={issue.uncertainties} />
                <SourceList ids={issue.sourceIds} sources={sources} demo={issue.demo} />
              </Detail>
            ))}
          </div>
        </section>
      ) : null}

      {issues.map ? (
        <section className={styles.card} aria-labelledby="interest-title">
          <SectionHeading id="interest-title" data={issues.map} icon="globe">
            Carte des intérêts stratégiques
          </SectionHeading>
          <ApprocheMap map={issues.map} sources={sources} />
        </section>
      ) : null}

      {issues.calendar.length > 0 ? (
        <section className={styles.card} aria-labelledby="calendar-title">
          <SectionHeading id="calendar-title" data={issues.calendar} icon="calendar">
            Calendrier des échéances
          </SectionHeading>
          <Timeline items={issues.calendar} sources={sources} />
          <p className={styles.cardNote}>Réalisé, en cours, annoncé ou prévu : une échéance future n&apos;est jamais présentée comme certaine et cite sa source officielle.</p>
        </section>
      ) : null}

      <div className={styles.twoCols}>
        {issues.opportunities.length > 0 ? (
          <section className={`${styles.card} ${styles.panelGood}`} aria-labelledby="opp-title">
            <SectionHeading id="opp-title" data={issues.opportunities} icon="trend">
              Opportunités
            </SectionHeading>
            <ul className={styles.plainList}>
              {issues.opportunities.map((entry) => (
                <li key={entry.id}>
                  <details className={styles.fold}>
                    <summary>
                      <span className={`${styles.iconBubble} ${styles.tone_good}`}>
                        <Icon name={iconForTopic(entry.title, "trend")} size={15} />
                      </span>
                      <span className={styles.itemTitle}>{entry.title}</span>
                    </summary>
                    <div className={styles.foldBody}>
                      {entry.summary ? <p>{entry.summary}</p> : null}
                      <SourceList ids={entry.sourceIds} sources={sources} demo={entry.demo} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
            <p className={styles.cardNote}>Les opportunités sont des possibilités, non des événements futurs assurés.</p>
          </section>
        ) : null}
        {issues.risks.length > 0 ? (
          <section className={`${styles.card} ${styles.panelBad}`} aria-labelledby="risk-title">
            <SectionHeading id="risk-title" data={issues.risks} icon="warning">
              Risques et menaces
            </SectionHeading>
            <ul className={styles.plainList}>
              {issues.risks.map((entry) => (
                <li key={entry.id}>
                  <details className={styles.fold}>
                    <summary>
                      <span className={`${styles.iconBubble} ${styles.tone_bad}`}>
                        <Icon name={iconForTopic(entry.title, "warning")} size={15} />
                      </span>
                      <span className={styles.itemTitle}>{entry.title}</span>
                    </summary>
                    <div className={styles.foldBody}>
                      {entry.summary ? <p>{entry.summary}</p> : null}
                      <SourceList ids={entry.sourceIds} sources={sources} demo={entry.demo} />
                    </div>
                  </details>
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
