import type { CountryMapData } from "@/components/country-profile/CountryMap";
import type { OverviewModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import Link from "next/link";
import ApprocheMap from "./ApprocheMap";
import Icon from "./Icon";
import CountryMapFrame from "./CountryMapFrame";
import MetricCard from "./MetricCard";
import { IconRow, KpiGrid, SectionHeading, Timeline, type SourceMap } from "./shared";
import styles from "./Approche.module.css";

interface OverviewTabProps {
  /** Adresse de l'onglet Défense, pour la tuile « Effectifs militaires ». */
  defenseHref: string;
  metrics: Map<string, MetricView>;
  /** Clés des valeurs en attente de vérification : affichées comme telles, jamais comme un fait. */
  pending: Set<string>;
  map: CountryMapData;
  module: OverviewModule;
  sources: SourceMap;
}

const NOT_VERIFIED = "À vérifier sur la source officielle";

export default function OverviewTab({ defenseHref, metrics, pending, map, module, sources }: OverviewTabProps) {
  const get = (key: string) => metrics.get(key) ?? null;
  const missingFor = (key: string) => (pending.has(key) ? NOT_VERIFIED : "Donnée non disponible");
  // Superficie : première mesure `geography.area.*` du fichier (la source figure dans la clé : eurostat, worldbank…).
  const area = get([...metrics.keys()].find((key) => key.startsWith("geography.area")) ?? "");
  const population = get("demography.population");
  const density = get("demography.density");
  // Une appartenance n'apparaît que si le fichier la documente (ou la signale à vérifier) : un pays hors UE n'a pas de ligne « Zone euro ».
  const memberships = [
    { key: "institutions.eu_membership", label: "Union européenne" },
    { key: "institutions.euro_area", label: "Zone euro" },
    { key: "institutions.schengen", label: "Espace Schengen" },
    { key: "institutions.nato", label: "OTAN" },
    { key: "institutions.unsc", label: "Conseil de sécurité de l'ONU" },
  ].filter(({ key }) => get(key) || pending.has(key));
  const hasAnalysis = module.strengths.length + module.challenges.length + module.timeline.length > 0;

  return (
    <div className={styles.tabBody}>
      <section aria-labelledby="kpi-title">
        <h2 id="kpi-title" className={styles.srOnly}>
          Chiffres clés
        </h2>
        <KpiGrid>
          <MetricCard label="Population" metric={get("demography.population")} />
          <MetricCard label="PIB nominal" metric={get("economy.gdp_nominal_usd")} />
          <MetricCard label="PIB par habitant" metric={get("economy.gdp_per_capita_usd")} />
          <Link href={defenseHref} className={`${styles.tile} ${styles.tileLink}`}>
            <span className={styles.tileLabel}>
              <Icon name="shield" size={15} />
              Effectifs militaires
            </span>
            <span className={styles.tileLinkText}>Voir les effectifs →</span>
            <span className={styles.tileMeta}>Onglet Défense et sécurité</span>
          </Link>
          <MetricCard label="Capitale" metric={get("identity.capital")} />
          <MetricCard label="Régime" metric={get("politics.regime")} />
        </KpiGrid>
      </section>

      <div className={styles.twoCols}>
        <section className={styles.card} aria-labelledby="map-title">
          <SectionHeading id="map-title" icon="map">
            Carte
          </SectionHeading>
          <CountryMapFrame data={map} />
          <p className={styles.cardNote}>
            Fond de carte : contours des pays du site (carte d&apos;ensemble) et imagerie Esri. Les limites administratives officielles seront ajoutées avec leur source et leur licence.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="general-title">
          <SectionHeading id="general-title" icon="book">
            Informations générales
          </SectionHeading>
          <div className={styles.rows}>
            <MetricCard variant="row" label="Capitale" metric={get("identity.capital")} />
            <MetricCard variant="row" label="Superficie" metric={area} />
            <MetricCard variant="row" label="Population" metric={get("demography.population")} />
            {density ? (
              <MetricCard variant="row" label="Densité" metric={density} icon="users" />
            ) : population && area ? (
              <MetricCard
                variant="row"
                label="Densité"
                metric={null}
                missing="Non calculée"
                missingHint="population et superficie de sources ou de périmètres différents : à harmoniser avant tout calcul"
                icon="users"
              />
            ) : null}
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
            {module.territories.title.replace(/\s*\((démonstration|exemple fictif)\)\s*$/i, "")}
          </SectionHeading>
          <ApprocheMap map={module.territories} sources={sources} height={320} />
        </section>
      ) : null}

      {memberships.length > 0 ? (
        <section className={styles.card} aria-labelledby="orgs-title">
          <SectionHeading id="orgs-title" icon="globe">
            Appartenances
          </SectionHeading>
          <div className={styles.rows}>
            {memberships.map(({ key, label }) => (
              <MetricCard key={key} variant="row" label={label} metric={get(key)} missing={missingFor(key)} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="macro-title">
        <SectionHeading id="macro-title" icon="chart">
          Indicateurs clés
        </SectionHeading>
        <KpiGrid>
          <MetricCard label="Croissance du PIB réel" metric={get("economy.gdp_growth")} />
          <MetricCard label="Inflation (IPC)" metric={get("economy.inflation_cpi")} />
          <MetricCard label="Chômage (estimation OIT)" metric={get("labour.unemployment_ilo")} />
          <MetricCard label="Dette publique (% du PIB)" metric={get("economy.public_debt_gdp")} />
          <MetricCard label="Recherche et développement" metric={get("research.rd_gdp")} />
        </KpiGrid>
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
          <p className={styles.cardNote}>
            Atouts et défis sont des appréciations analytiques, sourcées et datées : aucune barre de « puissance » ni score n&apos;est affiché tant qu&apos;aucune méthode publiée ne le permet.
          </p>
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
