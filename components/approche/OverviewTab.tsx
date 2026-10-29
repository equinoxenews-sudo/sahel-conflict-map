import type { CountryMapData } from "@/components/country-profile/CountryMap";
import type { OverviewModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import CountryMapFrame from "./CountryMapFrame";
import MetricCard from "./MetricCard";
import { IconRow, SectionHeading, Timeline, type SourceMap } from "./shared";
import styles from "./Approche.module.css";

interface OverviewTabProps {
  metrics: Map<string, MetricView>;
  /** Clés des valeurs en attente de vérification : affichées comme telles, jamais comme un fait. */
  pending: Set<string>;
  map: CountryMapData;
  module: OverviewModule;
  sources: SourceMap;
}

const NOT_VERIFIED = "À vérifier sur la source officielle";

export default function OverviewTab({ metrics, pending, map, module, sources }: OverviewTabProps) {
  const get = (key: string) => metrics.get(key) ?? null;
  const missingFor = (key: string) => (pending.has(key) ? NOT_VERIFIED : "Donnée non disponible");
  const hasAnalysis = module.strengths.length + module.challenges.length + module.timeline.length > 0;

  return (
    <div className={styles.tabBody}>
      <section aria-labelledby="kpi-title">
        <h2 id="kpi-title" className={styles.srOnly}>
          Chiffres clés
        </h2>
        <div className={styles.tiles}>
          <MetricCard label="Population" metric={get("demography.population")} />
          <MetricCard label="PIB nominal" metric={get("economy.gdp_nominal_usd")} />
          <MetricCard label="PIB par habitant" metric={get("economy.gdp_per_capita_usd")} />
          <MetricCard label="Effectifs militaires" metric={null} missing="Onglet Défense" icon="shield" />
          <MetricCard label="Capitale" metric={get("identity.capital")} />
          <MetricCard label="Régime" metric={get("politics.regime")} />
        </div>
      </section>

      <div className={styles.twoCols}>
        <section className={styles.card} aria-labelledby="map-title">
          <SectionHeading id="map-title" icon="map">
            Carte
          </SectionHeading>
          <CountryMapFrame data={map} />
          <p className={styles.cardNote}>Fond de carte : contours des pays du site (carte d&apos;ensemble) et imagerie Esri. Les limites administratives officielles seront ajoutées avec leur source et leur licence.</p>
        </section>

        <section className={styles.card} aria-labelledby="general-title">
          <SectionHeading id="general-title" icon="book">
            Informations générales
          </SectionHeading>
          <div className={styles.rows}>
            <MetricCard variant="row" label="Capitale" metric={get("identity.capital")} />
            <MetricCard variant="row" label="Superficie" metric={get("geography.area.eurostat")} />
            <MetricCard variant="row" label="Population" metric={get("demography.population")} />
            <MetricCard variant="row" label="Densité" metric={null} missing="Non calculée : périmètres de population et de superficie différents" icon="users" />
            <MetricCard variant="row" label="Régime" metric={get("politics.regime")} />
            <MetricCard variant="row" label="Chef de l'État" metric={get("politics.head_of_state")} icon="landmark" />
            <MetricCard variant="row" label="Premier ministre" metric={get("politics.head_of_government")} missing={missingFor("politics.head_of_government")} icon="landmark" />
            <MetricCard variant="row" label="Langue" metric={get("identity.language")} />
            <MetricCard variant="row" label="Monnaie" metric={get("identity.currency")} />
          </div>
        </section>
      </div>

      {module.territories ? (
        <section className={styles.card} aria-labelledby="territories-title">
          <SectionHeading id="territories-title" data={module.territories} icon="pin">
            Territoires d&apos;outre-mer
          </SectionHeading>
          <ApprocheMap map={module.territories} sources={sources} height={320} />
        </section>
      ) : null}

      <section className={styles.card} aria-labelledby="orgs-title">
        <SectionHeading id="orgs-title" icon="globe">
          Appartenances
        </SectionHeading>
        <div className={styles.rows}>
          <MetricCard variant="row" label="Union européenne" metric={get("institutions.eu_membership")} />
          <MetricCard variant="row" label="Zone euro" metric={get("institutions.euro_area")} />
          <MetricCard variant="row" label="Espace Schengen" metric={get("institutions.schengen")} />
          <MetricCard variant="row" label="OTAN" metric={get("institutions.nato")} />
          <MetricCard variant="row" label="Conseil de sécurité de l'ONU" metric={get("institutions.unsc")} missing={missingFor("institutions.unsc")} />
        </div>
      </section>

      <section aria-labelledby="macro-title">
        <SectionHeading id="macro-title" icon="chart">
          Indicateurs clés
        </SectionHeading>
        <div className={styles.tiles}>
          <MetricCard label="Croissance du PIB réel" metric={get("economy.gdp_growth")} />
          <MetricCard label="Inflation (IPC)" metric={get("economy.inflation_cpi")} />
          <MetricCard label="Chômage (estimation OIT)" metric={get("labour.unemployment_ilo")} />
          <MetricCard label="Dette publique (% du PIB)" metric={get("economy.public_debt_gdp")} />
          <MetricCard label="Recherche et développement" metric={get("research.rd_gdp")} />
        </div>
      </section>

      {hasAnalysis ? (
        <>
          <div className={styles.twoCols}>
            <section className={styles.card} aria-labelledby="strengths-title">
              <SectionHeading id="strengths-title" data={module.strengths} icon="star">
                Atouts stratégiques
              </SectionHeading>
              <ul className={styles.plainList}>
                {module.strengths.map((entry) => (
                  <li key={entry.id}>
                    <IconRow item={entry} sources={sources} icon="check" tone="good" />
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.card} aria-labelledby="challenges-title">
              <SectionHeading id="challenges-title" data={module.challenges} icon="warning">
                Défis majeurs
              </SectionHeading>
              <ul className={styles.plainList}>
                {module.challenges.map((entry) => (
                  <li key={entry.id}>
                    <IconRow item={entry} sources={sources} icon="warning" tone="warn" />
                  </li>
                ))}
              </ul>
            </section>
          </div>
          {module.timeline.length > 0 ? (
            <section className={styles.card} aria-labelledby="timeline-title">
              <SectionHeading id="timeline-title" data={module.timeline} icon="clock">
                Chronologie récente
              </SectionHeading>
              <Timeline items={module.timeline} sources={sources} />
            </section>
          ) : null}
          <p className={styles.cardNote}>Atouts et défis sont des appréciations analytiques, sourcées et datées : aucune barre de « puissance » ni score n&apos;est affiché tant qu&apos;aucune méthode publiée ne le permet.</p>
        </>
      ) : (
        <section className={styles.card} aria-labelledby="analysis-title">
          <SectionHeading id="analysis-title" icon="star">
            Atouts, défis et chronologie
          </SectionHeading>
          <p className={styles.cardNote}>Ces rubriques sont des analyses : elles seront publiées une fois rédigées avec leurs sources et relues, jamais générées au moment de la consultation.</p>
        </section>
      )}
    </div>
  );
}
