import type { OutlookModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import Detail from "./Detail";
import MetricCard from "./MetricCard";
import { ItemCard, SectionHeading, SourceList, type SourceMap } from "./shared";
import styles from "./Approche.module.css";

interface OutlookTabProps {
  outlook: OutlookModule;
  metrics: Map<string, MetricView>;
  sources: SourceMap;
}

const SCENARIO_LABELS = { reinforcement: "Renforcement", pressure: "Continuité sous pression", fragility: "Fragilisation" } as const;
/** Trajectoires purement illustratives (schéma conceptuel) : aucune donnée, aucune prévision. */
const SCENARIO_PATHS = { reinforcement: "M4 40 C 30 36, 52 24, 76 8", pressure: "M4 24 C 28 26, 52 22, 76 24", fragility: "M4 8 C 30 14, 52 30, 76 42" } as const;
const SCENARIO_COLORS = { reinforcement: "#35b779", pressure: "#3d9be9", fragility: "#d94a4a" } as const;

export default function OutlookTab({ outlook, metrics, sources }: OutlookTabProps) {
  const swot = outlook.swot;
  const swotColumns = [
    { key: "strengths", title: "Forces", items: swot.strengths },
    { key: "weaknesses", title: "Faiblesses", items: swot.weaknesses },
    { key: "opportunities", title: "Opportunités", items: swot.opportunities },
    { key: "threats", title: "Menaces", items: swot.threats },
  ];
  const hasSwot = swotColumns.some((column) => column.items.length > 0);

  if (!outlook.domains.length && !outlook.scenarios.length && !hasSwot && !outlook.map) {
    return (
      <section className={styles.card}>
        <h2>Vulnérabilités et perspectives</h2>
        <p className={styles.cardNote}>Aucune analyse n&apos;est publiée pour ce pays pour l&apos;instant.</p>
      </section>
    );
  }

  return (
    <div className={styles.tabBody}>
      {outlook.domains.length > 0 ? (
        <section aria-labelledby="domains-title">
          <SectionHeading id="domains-title" data={outlook.domains}>
            Vulnérabilités par domaine
          </SectionHeading>
          <p className={styles.cardNote}>Résumé qualitatif sourcé : aucun « niveau global de vulnérabilité » n&apos;est affiché tant qu&apos;aucun indice transparent (variables, pondérations, dates, limites) n&apos;est publié.</p>
          <div className={styles.cardGrid}>
            {outlook.domains.map((domain) => (
              <ItemCard key={domain.id} item={domain} sources={sources} />
            ))}
          </div>
        </section>
      ) : null}

      {outlook.map ? (
        <section className={styles.card} aria-labelledby="hazard-title">
          <SectionHeading id="hazard-title" data={outlook.map}>
            Carte des aléas documentés
          </SectionHeading>
          <ApprocheMap map={outlook.map} sources={sources} />
        </section>
      ) : null}

      {outlook.dependencies.length > 0 ? (
        <section aria-labelledby="deps-title">
          <SectionHeading id="deps-title" data={outlook.dependencies}>
            Dépendances stratégiques
          </SectionHeading>
          <p className={styles.cardNote}>Une valeur chiffrée n&apos;est affichée que si son dénominateur, son année, son territoire et sa source sont définis ; sinon la dépendance est décrite qualitativement (« méthodologie requise »). « % importé », « % produit hors UE », « origine des importations » et « concentration du marché » sont quatre notions différentes.</p>
          <div className={styles.cardGrid}>
            {outlook.dependencies.map((dependency) => {
              const metric = dependency.observationKey ? (metrics.get(dependency.observationKey) ?? null) : null;
              return metric && dependency.state === "measured" ? (
                <MetricCard key={dependency.id} label={dependency.title} metric={metric} />
              ) : (
                <ItemCard key={dependency.id} item={{ ...dependency, tags: [...dependency.tags, "Méthodologie requise"] }} sources={sources} />
              );
            })}
          </div>
        </section>
      ) : null}

      {hasSwot ? (
        <section aria-labelledby="swot-title">
          <SectionHeading id="swot-title" data={swot}>
            Analyse SWOT
          </SectionHeading>
          <div className={styles.swot}>
            {swotColumns.map((column) => (
              <div key={column.key} className={`${styles.card} ${styles[`swot_${column.key}`]}`}>
                <h3 className={styles.colTitle}>{column.title}</h3>
                <ul className={styles.plainList}>
                  {column.items.map((entry) => (
                    <li key={entry.id}>
                      <Detail title={entry.title} className={styles.listButton} trigger={entry.title}>
                        <p className={styles.cardNote}>Type : analyse{entry.date ? ` · mise à jour : ${entry.date}` : ""}</p>
                        {entry.summary ? <p>{entry.summary}</p> : null}
                        <SourceList ids={entry.sourceIds} sources={sources} demo={entry.demo} />
                      </Detail>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className={styles.cardNote}>Chaque ligne est une analyse attribuée et datée, avec ses sources. Les opportunités sont des possibilités, non des événements assurés.</p>
        </section>
      ) : null}

      {outlook.scenarios.length > 0 ? (
        <section aria-labelledby="scen-title">
          <SectionHeading id="scen-title" data={outlook.scenarios}>
            Scénarios prospectifs (narratifs)
          </SectionHeading>
          <p className={styles.cardNote}>Trois scénarios contrastés, sans pourcentage : aucune probabilité n&apos;est affichée tant qu&apos;aucun modèle prospectif documenté n&apos;existe. Les courbes sont un schéma conceptuel, non une prévision.</p>
          <div className={styles.scenarioGrid}>
            {outlook.scenarios.map((scenario) => (
              <Detail
                key={scenario.id}
                title={`${SCENARIO_LABELS[scenario.kind]} — ${scenario.title}`}
                className={styles.scenarioCard}
                trigger={
                  <>
                    <span className={styles.itemMeta} style={{ color: SCENARIO_COLORS[scenario.kind] }}>
                      {SCENARIO_LABELS[scenario.kind]}
                    </span>
                    <span className={styles.itemTitle}>{scenario.title}</span>
                    <span className={styles.itemSummary}>{scenario.summary}</span>
                    <svg viewBox="0 0 80 48" className={styles.curve} role="img" aria-label="Schéma conceptuel, pas une prévision">
                      <path d={SCENARIO_PATHS[scenario.kind]} fill="none" stroke={SCENARIO_COLORS[scenario.kind]} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" />
                    </svg>
                    <span className={styles.itemMeta}>Schéma conceptuel · non une prévision</span>
                    <span className={styles.sourceHint}>Hypothèses ›</span>
                  </>
                }
              >
                <p>{scenario.summary}</p>
                {[
                  ["Hypothèses", scenario.assumptions],
                  ["Déclencheurs", scenario.triggers],
                  ["Signaux faibles", scenario.weakSignals],
                  ["Conséquences potentielles", scenario.consequences],
                  ["Limites", scenario.limits],
                ].map(([title, entries]) =>
                  (entries as string[]).length > 0 ? (
                    <div key={title as string}>
                      <h4>{title as string}</h4>
                      <ul className={styles.bullets}>
                        {(entries as string[]).map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
                <SourceList ids={scenario.sourceIds} sources={sources} demo={scenario.demo} />
              </Detail>
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.twoCols}>
        {outlook.watchAxes.length > 0 ? (
          <section className={styles.card} aria-labelledby="watch-title">
            <SectionHeading id="watch-title" data={outlook.watchAxes}>
              Axes de surveillance
            </SectionHeading>
            <ul className={styles.plainList}>
              {outlook.watchAxes.map((axis) => (
                <li key={axis.id}>
                  <ItemCard item={axis} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ul>
            <p className={styles.cardNote}>Variables de suivi et futurs possibles, non des recommandations politiques.</p>
          </section>
        ) : null}
        {outlook.timeline.length > 0 ? (
          <section className={styles.card} aria-labelledby="otl-title">
            <SectionHeading id="otl-title" data={outlook.timeline}>
              Chronologie des enjeux
            </SectionHeading>
            <ol className={styles.timeline}>
              {outlook.timeline.map((entry) => (
                <li key={entry.id}>
                  <span className={styles.timelineDate}>{entry.date}</span>
                  <ItemCard item={{ ...entry, date: null }} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </div>
  );
}
