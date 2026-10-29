import { iconForTopic } from "@/lib/approche/metricIcons";
import type { EconomyModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import InteractiveDonut from "./InteractiveDonut";
import MetricCard from "./MetricCard";
import { ItemCard, SectionHeading, type SourceMap } from "./shared";
import type { MediaMap } from "./Visual";
import styles from "./Approche.module.css";

interface EconomyTabProps {
  metrics: Map<string, MetricView>;
  module: EconomyModule;
  sources: SourceMap;
  media: MediaMap;
  demoActive: boolean;
}

const BRANCHES = ["A", "B-E", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"];
const DONUT_COLORS = ["#e0b44c", "#3d9be9", "#35b779", "#d94a4a", "#9b6be8", "#e87932", "#6fd3d3", "#c05fa8", "#8f9baa", "#b4c85a"];

/** Parts de l'électricité produite : valeurs RTE, et deux parts CALCULÉES (autres renouvelables, écart non détaillé) signalées comme telles. */
function productionSegments(get: (key: string) => MetricView | null) {
  const raw = (key: string) => get(`energy.electricity.${key}`)?.raw ?? null;
  const total = raw("production_total");
  const nuclear = raw("nuclear");
  const renewable = raw("renewable");
  const hydro = raw("hydro");
  const windSolar = raw("wind_solar");
  const fossil = raw("fossil");
  if (total === null || nuclear === null || renewable === null || hydro === null || windSolar === null || fossil === null) return null;
  const otherRenewable = Math.max(renewable - hydro - windSolar, 0);
  const rest = Math.max(total - nuclear - renewable - fossil, 0);
  return {
    total,
    segments: [
      { id: "nuclear", label: "Nucléaire", value: nuclear, color: "#9b6be8", calc: false },
      { id: "hydro", label: "Hydraulique", value: hydro, color: "#3d9be9", calc: false },
      { id: "windsolar", label: "Éolien et solaire", value: windSolar, color: "#35b779", calc: false },
      { id: "otherren", label: "Autres renouvelables (calculé)", value: otherRenewable, color: "#6fd3a8", calc: true },
      { id: "fossil", label: "Origine fossile", value: fossil, color: "#e87932", calc: false },
      { id: "rest", label: "Non détaillé (écart de la source, calculé)", value: rest, color: "#8f9baa", calc: true },
    ].filter((segment) => segment.value > 0.05),
  };
}

export default function EconomyTab({ metrics, module, sources, media, demoActive }: EconomyTabProps) {
  const get = (key: string) => metrics.get(key) ?? null;
  const branches = BRANCHES.flatMap((code) => {
    const share = get(`economy.value_added_share.${code}`);
    const amount = get(`economy.value_added.${code}`);
    return share && amount ? [{ code, share, amount }] : [];
  });
  const total = get("economy.value_added.total");
  const production = productionSegments(get);
  const slices = branches.map(({ code, share, amount }, index) => ({ id: code, label: share.label, share: share.raw ?? 0, amount: `${amount.value} ${amount.unit}`.trim(), color: DONUT_COLORS[index % DONUT_COLORS.length] }));
  const top = [...branches].sort((a, b) => (b.share.raw ?? 0) - (a.share.raw ?? 0)).slice(0, 5);
  const exportsGross = get("energy.electricity.exports_gross");
  const imports = get("energy.electricity.imports");
  const maxFlow = Math.max(exportsGross?.raw ?? 0, imports?.raw ?? 0, 1);

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
        <SectionHeading id="structure-title" icon="chart">
          Structure de l&apos;économie : valeur ajoutée par branche
        </SectionHeading>
        {slices.length > 0 && total ? (
          <>
            <InteractiveDonut slices={slices} center={total.period} label={`Répartition de la valeur ajoutée par branche, ${total.period}`} />
            <details className={styles.details}>
              <summary>
                <span>Voir les détails des {branches.length} branches</span>
              </summary>
              <div className={styles.rows}>
                {branches.map(({ code, share, amount }) => (
                  <MetricCard key={code} variant="row" label={share.label} metric={amount} display={`${share.value} % · ${amount.value}`} icon={iconForTopic(share.label, "coins")} />
                ))}
              </div>
            </details>
            <p className={styles.cardNote}>
              Principales branches : {top.map(({ share }) => `${share.label} (${share.value} %)`).join(", ")}. Valeur ajoutée brute totale de {total.period} : {total.value} {total.unit}. Chaque part est calculée (valeur ajoutée de la branche ÷ valeur ajoutée totale) à partir de deux observations Eurostat, aux prix courants, nomenclature A10 ; l&apos;industrie manufacturière est incluse dans « Industrie (hors construction) ». La valeur ajoutée n&apos;est ni le PIB ni la part de l&apos;emploi.
            </p>
          </>
        ) : (
          <p className={styles.missing}>Donnée non disponible</p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="elec-title">
        <SectionHeading id="elec-title" icon="bolt">
          Énergie : électricité (bilan 2024)
        </SectionHeading>
        {production ? (
          <div className={styles.energyGrid}>
            <div>
              <h3 className={styles.colTitle}>Production d&apos;électricité par filière</h3>
              <div className={styles.stack} role="img" aria-label={`Production totale ${production.total} TWh : ${production.segments.map((segment) => `${segment.label} ${segment.value.toFixed(1)} TWh`).join(", ")}`}>
                {production.segments.map((segment) => (
                  <span key={segment.id} style={{ width: `${(segment.value / production.total) * 100}%`, background: segment.color }} title={`${segment.label} : ${segment.value.toFixed(1)} TWh`} />
                ))}
              </div>
              <ul className={styles.stackLegend}>
                {production.segments.map((segment) => (
                  <li key={segment.id}>
                    <i style={{ background: segment.color }} aria-hidden />
                    <span>{segment.label}</span>
                    <strong>
                      {segment.value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} TWh · {((segment.value / production.total) * 100).toFixed(1).replace(".", ",")} %
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={styles.colTitle}>Échanges d&apos;électricité</h3>
              {[
                { label: "Exportations brutes", metric: exportsGross, color: "#35b779" },
                { label: "Importations", metric: imports, color: "#e87932" },
              ].map(({ label, metric, color }) =>
                metric ? (
                  <div key={label} className={styles.flow}>
                    <span>{label}</span>
                    <span className={styles.flowBar}>
                      <span style={{ width: `${((metric.raw ?? 0) / maxFlow) * 100}%`, background: color }} />
                    </span>
                    <strong>{metric.value} TWh</strong>
                  </div>
                ) : null,
              )}
              <div className={styles.tiles}>
                <MetricCard label="Solde net exportateur" metric={get("energy.electricity.net_exports")} />
                <MetricCard label="Consommation (corrigée du climat)" metric={get("energy.electricity.consumption")} />
                <MetricCard label="Dépendance aux importations d'énergie" metric={get("energy.import_dependency")} />
              </div>
            </div>
          </div>
        ) : (
          <p className={styles.missing}>Donnée non disponible</p>
        )}
        <details className={styles.details}>
          <summary>
            <span>Voir les chiffres sourcés</span>
          </summary>
          <div className={styles.rows}>
            {["production_total", "nuclear", "renewable", "hydro", "wind_solar", "solar", "fossil", "exports_gross", "imports", "net_exports", "consumption"].map((key) => {
              const metric = get(`energy.electricity.${key}`);
              return <MetricCard key={key} variant="row" label={metric?.label || key} metric={metric} />;
            })}
          </div>
        </details>
        <p className={styles.cardNote}>
          Source : RTE, bilan électrique 2024. Il s&apos;agit de l&apos;électricité seule : ni le mix d&apos;énergie primaire, ni la consommation finale d&apos;énergie. Production, échanges, consommation et dépendance aux importations d&apos;énergie sont quatre notions distinctes, jamais additionnées. La dépendance (Eurostat, tous produits énergétiques) est définie comme les importations nettes rapportées à l&apos;énergie brute disponible. Les parts « calculées » sont des différences entre valeurs publiées.
        </p>
      </section>

      {module.sectors.length > 0 ? (
        <section aria-labelledby="sectors-title">
          <SectionHeading id="sectors-title" data={module.sectors} icon="factory">
            Principaux secteurs
          </SectionHeading>
          <div className={styles.cardGrid}>
            {module.sectors.map((sector) => (
              <ItemCard key={sector.id} item={sector} sources={sources} visual={{ media, demoActive, icon: iconForTopic(sector.title), hue: 205 }} />
            ))}
          </div>
        </section>
      ) : null}

      {module.map ? (
        <section className={styles.card} aria-labelledby="resmap-title">
          <SectionHeading id="resmap-title" data={module.map} icon="anchor">
            Carte des ressources et des infrastructures
          </SectionHeading>
          <ApprocheMap map={module.map} sources={sources} />
        </section>
      ) : null}

      {module.resources.length > 0 ? (
        <section aria-labelledby="resources-title">
          <SectionHeading id="resources-title" data={module.resources} icon="gem">
            Principales ressources et matières premières
          </SectionHeading>
          <p className={styles.cardNote}>Ressource présente, production nationale, importation et dépendance étrangère sont des notions distinctes : chaque chiffre porte sa définition, son année et sa source.</p>
          <div className={styles.cardGrid}>
            {module.resources.map((resource) => (
              <ItemCard key={resource.id} item={resource} sources={sources} visual={{ media, demoActive, icon: iconForTopic(resource.title, "gem"), hue: 160 }} />
            ))}
          </div>
        </section>
      ) : null}

      {module.sectors.length + module.resources.length === 0 && !module.map ? (
        <section className={styles.card} aria-labelledby="todo-title">
          <SectionHeading id="todo-title" icon="factory">
            À venir dans cet onglet
          </SectionHeading>
          <p className={styles.cardNote}>
            Secteurs stratégiques, ports et infrastructures (couches de carte avec jeu de données, licence et date), commerce extérieur (Douanes, Eurostat, UN Comtrade), matières premières : chaque rubrique sera publiée avec ses sources lues et sa licence vérifiée, et reste absente tant que ce n&apos;est pas le cas.
          </p>
        </section>
      ) : null}
    </div>
  );
}
