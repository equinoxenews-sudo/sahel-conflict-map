import CountryMap, { type CountryMapData } from "@/components/country-profile/CountryMap";
import type { OverviewModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import MetricCard from "./MetricCard";
import { ItemCard, SectionHeading, type SourceMap } from "./shared";
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
  const hasAnalysis = module.strengths.length + module.challenges.length + module.timeline.length > 0;
  const get = (key: string) => metrics.get(key) ?? null;
  const missingFor = (key: string) => (pending.has(key) ? NOT_VERIFIED : "Donnée non disponible");

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
          <MetricCard label="Effectifs militaires" metric={null} missing="Onglet Défense à venir" />
          <MetricCard label="Capitale" metric={get("identity.capital")} />
          <MetricCard label="Régime" metric={get("politics.regime")} />
        </div>
      </section>

      <div className={styles.twoCols}>
        <section className={styles.card} aria-labelledby="map-title">
          <h2 id="map-title">Carte</h2>
          <CountryMap data={map} />
          <p className={styles.cardNote}>Fond de carte : contours des pays du site (carte d&apos;ensemble, sans les territoires d&apos;outre-mer). Les limites administratives officielles seront ajoutées avec leur source.</p>
        </section>

        <section className={styles.card} aria-labelledby="general-title">
          <h2 id="general-title">Informations générales</h2>
          <div className={styles.rows}>
            <MetricCard variant="row" label="Capitale" metric={get("identity.capital")} />
            <MetricCard variant="row" label="Superficie" metric={get("geography.area.eurostat")} />
            <MetricCard variant="row" label="Population" metric={get("demography.population")} />
            <MetricCard variant="row" label="Densité" metric={null} missing="Non calculée : périmètres de population et de superficie différents" />
            <MetricCard variant="row" label="Régime" metric={get("politics.regime")} />
            <MetricCard variant="row" label="Chef de l'État" metric={get("politics.head_of_state")} />
            <MetricCard variant="row" label="Premier ministre" metric={get("politics.head_of_government")} missing={missingFor("politics.head_of_government")} />
            <MetricCard variant="row" label="Langue" metric={get("identity.language")} />
            <MetricCard variant="row" label="Monnaie" metric={get("identity.currency")} />
          </div>
        </section>
      </div>

      <section className={styles.card} aria-labelledby="orgs-title">
        <h2 id="orgs-title">Appartenances</h2>
        <div className={styles.rows}>
          <MetricCard variant="row" label="Union européenne" metric={get("institutions.eu_membership")} />
          <MetricCard variant="row" label="Zone euro" metric={get("institutions.euro_area")} />
          <MetricCard variant="row" label="Espace Schengen" metric={get("institutions.schengen")} />
          <MetricCard variant="row" label="OTAN" metric={get("institutions.nato")} />
          <MetricCard variant="row" label="Conseil de sécurité de l'ONU" metric={get("institutions.unsc")} missing={missingFor("institutions.unsc")} />
        </div>
      </section>

      <section aria-labelledby="macro-title">
        <h2 id="macro-title" className={styles.sectionTitle}>
          Indicateurs clés
        </h2>
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
              <SectionHeading id="strengths-title" data={module.strengths}>
                Atouts stratégiques
              </SectionHeading>
              <ul className={styles.plainList}>
                {module.strengths.map((entry) => (
                  <li key={entry.id}>
                    <ItemCard item={{ ...entry, summary: "" }} sources={sources} className={styles.listButton} />
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.card} aria-labelledby="challenges-title">
              <SectionHeading id="challenges-title" data={module.challenges}>
                Défis majeurs
              </SectionHeading>
              <ul className={styles.plainList}>
                {module.challenges.map((entry) => (
                  <li key={entry.id}>
                    <ItemCard item={{ ...entry, summary: "" }} sources={sources} className={styles.listButton} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
          {module.timeline.length > 0 ? (
            <section className={styles.card} aria-labelledby="timeline-title">
              <SectionHeading id="timeline-title" data={module.timeline}>
                Chronologie récente
              </SectionHeading>
              <ol className={styles.timeline}>
                {module.timeline.map((entry) => (
                  <li key={entry.id}>
                    <span className={styles.timelineDate}>{entry.date}</span>
                    <ItemCard item={{ ...entry, date: null }} sources={sources} className={styles.listButton} />
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          <p className={styles.cardNote}>Aucune barre de « puissance » ni score n&apos;est affiché tant qu&apos;aucune méthode publiée ne le permet : les « positionnements » sont remplacés par des indicateurs observables.</p>
        </>
      ) : (
        <section className={styles.card} aria-labelledby="analysis-title">
          <h2 id="analysis-title">Atouts, défis et chronologie</h2>
          <p className={styles.cardNote}>Ces rubriques sont des analyses : elles seront publiées une fois rédigées avec leurs sources et relues, jamais générées au moment de la consultation.</p>
        </section>
      )}
    </div>
  );
}
