import type { EconomyModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import Donut from "./Donut";
import MetricCard from "./MetricCard";
import { ItemCard, SectionHeading, type SourceMap } from "./shared";
import styles from "./Approche.module.css";

interface EconomyTabProps {
  metrics: Map<string, MetricView>;
  module: EconomyModule;
  sources: SourceMap;
}

const DONUT_COLORS = ["#e0b44c", "#3d9be9", "#35b779", "#d94a4a", "#9b6be8", "#e87932", "#6fd3d3", "#c05fa8", "#8f9baa", "#b4c85a"];

const BRANCHES = ["A", "B-E", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"];

const ELECTRICITY: { key: string; indent: boolean }[] = [
  { key: "production_total", indent: false },
  { key: "nuclear", indent: true },
  { key: "renewable", indent: true },
  { key: "hydro", indent: true },
  { key: "wind_solar", indent: true },
  { key: "solar", indent: true },
  { key: "fossil", indent: true },
  { key: "exports_gross", indent: false },
  { key: "imports", indent: false },
  { key: "net_exports", indent: false },
  { key: "consumption", indent: false },
];

export default function EconomyTab({ metrics, module, sources }: EconomyTabProps) {
  const get = (key: string) => metrics.get(key) ?? null;
  const branches = BRANCHES.flatMap((code) => {
    const share = get(`economy.value_added_share.${code}`);
    const amount = get(`economy.value_added.${code}`);
    return share && amount ? [{ code, share, amount }] : [];
  });
  const largest = Math.max(0, ...branches.map((branch) => branch.share.raw ?? 0));
  const total = get("economy.value_added.total");

  return (
    <div className={styles.tabBody}>
      <section aria-labelledby="eco-kpi-title">
        <h2 id="eco-kpi-title" className={styles.srOnly}>
          Chiffres clés de l&apos;économie
        </h2>
        <div className={styles.tiles}>
          <MetricCard label="PIB nominal" metric={get("economy.gdp_nominal_usd")} />
          <MetricCard label="PIB par habitant" metric={get("economy.gdp_per_capita_usd")} />
          <MetricCard label="Croissance du PIB réel" metric={get("economy.gdp_growth")} />
          <MetricCard label="Dette publique (% du PIB)" metric={get("economy.public_debt_gdp")} />
          <MetricCard label="Inflation (IPC)" metric={get("economy.inflation_cpi")} />
          <MetricCard label="Chômage (estimation OIT)" metric={get("labour.unemployment_ilo")} />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="structure-title">
        <h2 id="structure-title">Structure de l&apos;économie : valeur ajoutée par branche</h2>
        {branches.length > 0 && total ? (
          <>
            <div className={styles.donutRow}>
              <Donut
                label={`Répartition de la valeur ajoutée par branche, ${total.period}`}
                center={total.period}
                slices={branches.map(({ code, share }, index) => ({ id: code, label: share.label, value: share.raw ?? 0, color: DONUT_COLORS[index % DONUT_COLORS.length] }))}
              />
              <ul className={styles.donutLegend}>
                {branches.map(({ code, share }, index) => (
                  <li key={code}>
                    <i style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} aria-hidden />
                    {share.label} <strong>{share.value} %</strong>
                  </li>
                ))}
              </ul>
            </div>
            <ul className={styles.bars}>
              {branches.map(({ code, share, amount }) => (
                <li key={code}>
                  <MetricCard variant="row" label={share.label} metric={amount} display={`${share.value} % · ${amount.value}`} />
                  <span className={styles.bar} aria-hidden>
                    <span style={{ width: `${largest > 0 ? ((share.raw ?? 0) / largest) * 100 : 0}%` }} />
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.cardNote}>
              Valeur ajoutée brute totale de {total.period} : {total.value} {total.unit}. Chaque part est calculée (valeur ajoutée de la branche ÷ valeur ajoutée totale) à partir de deux observations Eurostat, aux prix courants, nomenclature A10. L&apos;industrie manufacturière est incluse dans « Industrie (hors construction) ». La valeur ajoutée n&apos;est ni le PIB ni la part de l&apos;emploi.
            </p>
          </>
        ) : (
          <p className={styles.missing}>Donnée non disponible</p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="elec-title">
        <h2 id="elec-title">Énergie : électricité (bilan 2024)</h2>
        <div className={styles.rows}>
          {ELECTRICITY.map(({ key, indent }) => {
            const metric = get(`energy.electricity.${key}`);
            return (
              <div key={key} className={indent ? styles.indent : undefined}>
                <MetricCard variant="row" label={metric?.label || key} metric={metric} />
              </div>
            );
          })}
        </div>
        <p className={styles.cardNote}>
          Source : RTE, bilan électrique 2024. Il s&apos;agit de l&apos;électricité seule : ce n&apos;est ni le mix d&apos;énergie primaire ni la consommation finale d&apos;énergie. Les lignes décalées sont comprises dans la ligne qui les précède (le renouvelable comprend l&apos;hydraulique et l&apos;éolien et solaire). Les parts « 67 / 9 / 24 % » de la maquette ne sont pas reprises : elles ne correspondent pas à ce bilan.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="dep-title">
        <h2 id="dep-title">Dépendance énergétique</h2>
        <div className={styles.tiles}>
          <MetricCard label="Dépendance aux importations d'énergie" metric={get("energy.import_dependency")} />
        </div>
        <p className={styles.cardNote}>
          Part des besoins énergétiques (tous produits : pétrole, gaz, charbon, nucléaire, renouvelables…) couverte par les importations nettes, selon la définition d&apos;Eurostat. Les dépendances par produit (pétrole, gaz, terres rares, semi-conducteurs…) ne sont affichées qu&apos;avec une formule, un dénominateur, une année et une source ; aucune n&apos;est reprise de la maquette.
        </p>
      </section>

      {module.sectors.length > 0 ? (
        <section aria-labelledby="sectors-title">
          <SectionHeading id="sectors-title" data={module.sectors}>
            Principaux secteurs
          </SectionHeading>
          <div className={styles.cardGrid}>
            {module.sectors.map((sector) => (
              <ItemCard key={sector.id} item={sector} sources={sources} />
            ))}
          </div>
        </section>
      ) : null}

      {module.map ? (
        <section className={styles.card} aria-labelledby="resmap-title">
          <SectionHeading id="resmap-title" data={module.map}>
            Carte des ressources et des infrastructures
          </SectionHeading>
          <ApprocheMap map={module.map} sources={sources} />
        </section>
      ) : null}

      {module.resources.length > 0 ? (
        <section aria-labelledby="resources-title">
          <SectionHeading id="resources-title" data={module.resources}>
            Principales ressources et matières premières
          </SectionHeading>
          <div className={styles.cardGrid}>
            {module.resources.map((resource) => (
              <ItemCard key={resource.id} item={resource} sources={sources} />
            ))}
          </div>
        </section>
      ) : null}

      {module.sectors.length + module.resources.length === 0 && !module.map ? (
        <section className={styles.card} aria-labelledby="todo-title">
          <h2 id="todo-title">À venir dans cet onglet</h2>
          <p className={styles.cardNote}>
            Secteurs stratégiques, ports et infrastructures (couches de carte avec jeu de données, licence et date), commerce extérieur (Douanes, Eurostat, UN Comtrade), matières premières : chaque rubrique sera publiée avec ses sources lues et sa licence vérifiée, et reste absente tant que ce n&apos;est pas le cas.
          </p>
        </section>
      ) : null}
    </div>
  );
}
