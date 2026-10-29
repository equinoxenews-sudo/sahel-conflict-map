import { iconForTopic } from "@/lib/approche/metricIcons";
import type { OutlookModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import Detail from "./Detail";
import Icon from "./Icon";
import MetricCard from "./MetricCard";
import { IconRow, ItemCard, SectionHeading, SourceList, Timeline, type SourceMap } from "./shared";
import type { MediaMap } from "./Visual";
import styles from "./Approche.module.css";

interface OutlookTabProps {
  outlook: OutlookModule;
  metrics: Map<string, MetricView>;
  sources: SourceMap;
  media: MediaMap;
  demoActive: boolean;
}

const SCENARIO_LABELS = { reinforcement: "Renforcement", pressure: "Continuité sous pression", fragility: "Fragilisation" } as const;
const SCENARIO_ICONS = { reinforcement: "trend", pressure: "scale", fragility: "warning" } as const;
/** Trajectoires purement illustratives (schéma conceptuel) : aucune donnée, aucune prévision. */
const SCENARIO_PATHS = { reinforcement: "M4 40 C 30 36, 52 24, 76 8", pressure: "M4 24 C 28 26, 52 22, 76 24", fragility: "M4 8 C 30 14, 52 30, 76 42" } as const;
const SCENARIO_COLORS = { reinforcement: "#35b779", pressure: "#3d9be9", fragility: "#d94a4a" } as const;

const SWOT = [
  { key: "strengths", title: "Forces", icon: "check", tone: "good", accent: "swot_strengths" },
  { key: "weaknesses", title: "Faiblesses", icon: "warning", tone: "warn", accent: "swot_weaknesses" },
  { key: "opportunities", title: "Opportunités", icon: "trend", tone: "info", accent: "swot_opportunities" },
  { key: "threats", title: "Menaces", icon: "flame", tone: "bad", accent: "swot_threats" },
] as const;

function ListBlock({ title, entries }: { title: string; entries: string[] }) {
  if (entries.length === 0) return null;
  return (
    <div>
      <h4>{title}</h4>
      <ul className={styles.bullets}>
        {entries.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

export default function OutlookTab({ outlook, metrics, sources, media, demoActive }: OutlookTabProps) {
  const swot = outlook.swot;
  const hasSwot = SWOT.some((column) => swot[column.key].length > 0);

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
          <SectionHeading id="domains-title" data={outlook.domains} icon="radar">
            Vulnérabilités par domaine
          </SectionHeading>
          <p className={styles.cardNote}>Résumé qualitatif sourcé : aucun « niveau global de vulnérabilité » n&apos;est affiché tant qu&apos;aucun indice transparent (variables, pondérations, dates, limites) n&apos;est publié.</p>
          <div className={styles.cardGrid}>
            {outlook.domains.map((domain, index) => (
              <ItemCard key={domain.id} item={domain} sources={sources} visual={{ media, demoActive, icon: iconForTopic(`${domain.title} ${domain.tags.join(" ")}`, "radar"), hue: (index * 41 + 190) % 360 }} />
            ))}
          </div>
        </section>
      ) : null}

      {outlook.map ? (
        <section className={styles.card} aria-labelledby="hazard-title">
          <SectionHeading id="hazard-title" data={outlook.map} icon="drop">
            Carte des aléas documentés
          </SectionHeading>
          <ApprocheMap map={outlook.map} sources={sources} />
        </section>
      ) : null}

      {outlook.dependencies.length > 0 ? (
        <section aria-labelledby="deps-title">
          <SectionHeading id="deps-title" data={outlook.dependencies} icon="scale">
            Dépendances stratégiques
          </SectionHeading>
          <p className={styles.cardNote}>Une valeur chiffrée n&apos;est affichée que si son dénominateur, son année, son territoire et sa source sont définis ; sinon la dépendance est décrite qualitativement. « % importé », « % produit hors UE », « origine des importations » et « concentration du marché » sont quatre notions différentes.</p>
          <div className={styles.depGrid}>
            {outlook.dependencies.map((dependency) => {
              const metric = dependency.observationKey ? (metrics.get(dependency.observationKey) ?? null) : null;
              return metric && dependency.state === "measured" ? (
                <MetricCard key={dependency.id} label={dependency.title} metric={metric} />
              ) : (
                <Detail
                  key={dependency.id}
                  title={dependency.title}
                  className={styles.depCard}
                  trigger={
                    <>
                      <span className={styles.depHead}>
                        <span className={styles.iconBubble}>
                          <Icon name={iconForTopic(dependency.title, "scale")} size={16} />
                        </span>
                        <span className={styles.itemTitle}>{dependency.title}</span>
                      </span>
                      <span className={styles.tag}>Méthodologie requise</span>
                      <span className={styles.sourceHint}>Voir la note ›</span>
                    </>
                  }
                >
                  <p>{dependency.summary}</p>
                  <SourceList ids={dependency.sourceIds} sources={sources} demo={dependency.demo} />
                </Detail>
              );
            })}
          </div>
        </section>
      ) : null}

      {hasSwot ? (
        <section aria-labelledby="swot-title">
          <SectionHeading id="swot-title" data={swot} icon="scale">
            Analyse SWOT
          </SectionHeading>
          <div className={styles.swot}>
            {SWOT.map((column) => (
              <div key={column.key} className={`${styles.card} ${styles[column.accent]}`}>
                <h3 className={styles.colTitle}>
                  <span className={`${styles.iconBubble} ${styles[`tone_${column.tone}`]}`}>
                    <Icon name={column.icon} size={15} />
                  </span>
                  {column.title}
                </h3>
                <ul className={styles.plainList}>
                  {swot[column.key].map((entry) => (
                    <li key={entry.id}>
                      <Detail title={entry.title} className={styles.listButton} trigger={<span className={styles.itemTitle}>{entry.title}</span>}>
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
          <SectionHeading id="scen-title" data={outlook.scenarios} icon="eye">
            Scénarios prospectifs (narratifs)
          </SectionHeading>
          <p className={styles.cardNote}>Trois scénarios contrastés, sans pourcentage : aucune probabilité n&apos;est affichée tant qu&apos;aucun modèle prospectif documenté n&apos;existe. Les courbes sont un schéma conceptuel, non une prévision.</p>
          <div className={styles.scenarioGrid}>
            {outlook.scenarios.map((scenario) => (
              <Detail
                key={scenario.id}
                title={`${SCENARIO_LABELS[scenario.kind]} — ${scenario.title}`}
                className={`${styles.scenarioCard} ${styles[`scenario_${scenario.kind}`]}`}
                trigger={
                  <>
                    <span className={styles.scenarioHead} style={{ color: SCENARIO_COLORS[scenario.kind] }}>
                      <Icon name={SCENARIO_ICONS[scenario.kind]} size={18} />
                      {SCENARIO_LABELS[scenario.kind]}
                    </span>
                    <span className={styles.itemTitle}>{scenario.title}</span>
                    <span className={styles.itemSummary}>{scenario.summary}</span>
                    <svg viewBox="0 0 80 48" className={styles.curve} role="img" aria-label="Schéma conceptuel, pas une prévision">
                      <path d={SCENARIO_PATHS[scenario.kind]} fill="none" stroke={SCENARIO_COLORS[scenario.kind]} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" />
                    </svg>
                    <span className={styles.itemMeta}>Schéma conceptuel · non une prévision</span>
                    <span className={styles.sourceHint}>Hypothèses et déclencheurs ›</span>
                  </>
                }
              >
                <p>{scenario.summary}</p>
                <ListBlock title="Hypothèses" entries={scenario.assumptions} />
                <ListBlock title="Déclencheurs" entries={scenario.triggers} />
                <ListBlock title="Signaux faibles à surveiller" entries={scenario.weakSignals} />
                <ListBlock title="Conséquences potentielles" entries={scenario.consequences} />
                <ListBlock title="Limites" entries={scenario.limits} />
                <SourceList ids={scenario.sourceIds} sources={sources} demo={scenario.demo} />
              </Detail>
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.twoCols}>
        {outlook.watchAxes.length > 0 ? (
          <section className={styles.card} aria-labelledby="watch-title">
            <SectionHeading id="watch-title" data={outlook.watchAxes} icon="radar">
              Axes de surveillance
            </SectionHeading>
            <ul className={styles.plainList}>
              {outlook.watchAxes.map((axis) => (
                <li key={axis.id} className={styles.watchRow}>
                  <IconRow item={axis} sources={sources} icon={iconForTopic(axis.title, "radar")} tone="info" />
                  <button type="button" className={styles.followButton} disabled title="Bientôt : création d'une veille Supervision sur cette thématique (selon l'abonnement)">
                    Suivre · bientôt
                  </button>
                </li>
              ))}
            </ul>
            <p className={styles.cardNote}>Variables de suivi et futurs possibles, non des recommandations politiques. Le suivi par une veille Supervision sera proposé selon les droits d&apos;abonnement.</p>
          </section>
        ) : null}
        {outlook.timeline.length > 0 ? (
          <section className={styles.card} aria-labelledby="otl-title">
            <SectionHeading id="otl-title" data={outlook.timeline} icon="clock">
              Chronologie des enjeux
            </SectionHeading>
            <Timeline items={outlook.timeline} sources={sources} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
