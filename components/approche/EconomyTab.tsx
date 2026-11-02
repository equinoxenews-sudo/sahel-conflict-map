import type { ComplementPanel } from "@/lib/approche/complements";
import type { ElectricityVintage } from "@/lib/approche/electricity";
import { VALUE_ADDED_BRANCHES } from "@/lib/approche/keys";
import { iconForTopic } from "@/lib/approche/metricIcons";
import type { EconomyModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import ComplementPanels from "./ComplementPanels";
import ElectricitySection from "./ElectricitySection";
import InteractiveDonut from "./InteractiveDonut";
import MetricCard from "./MetricCard";
import { ItemCard, KpiGrid, SectionHeading, type SourceMap } from "./shared";
import type { MediaMap } from "./Visual";
import styles from "./Approche.module.css";

interface EconomyTabProps {
  metrics: Map<string, MetricView>;
  module: EconomyModule;
  sources: SourceMap;
  media: MediaMap;
  demoActive: boolean;
  /** Millésimes d'électricité, du plus récent au plus ancien. */
  vintages: ElectricityVintage[];
  /** Données complémentaires de l'onglet, par rubrique. */
  complements: ComplementPanel[];
}

const DONUT_COLORS = ["#e0b44c", "#3d9be9", "#35b779", "#d94a4a", "#9b6be8", "#e87932", "#6fd3d3", "#c05fa8", "#8f9baa", "#b4c85a"];

export default function EconomyTab({ metrics, module, sources, media, demoActive, vintages, complements }: EconomyTabProps) {
  const get = (key: string) => metrics.get(key) ?? null;
  const branches = VALUE_ADDED_BRANCHES.flatMap((code) => {
    const share = get(`economy.value_added_share.${code}`);
    const amount = get(`economy.value_added.${code}`);
    return share && amount ? [{ code, share, amount }] : [];
  });
  const total = get("economy.value_added.total");
  const slices = branches.map(({ code, share, amount }, index) => ({
    id: code,
    label: share.label,
    share: share.raw ?? 0,
    amount: `${amount.value} ${amount.unit}`.trim(),
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  }));
  const top = [...branches].sort((a, b) => (b.share.raw ?? 0) - (a.share.raw ?? 0)).slice(0, 5);

  return (
    <div className={styles.tabBody}>
      <section aria-labelledby="eco-kpi-title">
        <h2 id="eco-kpi-title" className={styles.srOnly}>
          Chiffres clés de l&apos;économie
        </h2>
        <KpiGrid>
          <MetricCard label="PIB nominal" metric={get("economy.gdp_nominal_usd")} />
          <MetricCard label="PIB par habitant" metric={get("economy.gdp_per_capita_usd")} />
          <MetricCard label="Croissance du PIB réel" metric={get("economy.gdp_growth")} />
          <MetricCard label="Dette publique (% du PIB)" metric={get("economy.public_debt_gdp")} />
          <MetricCard label="Inflation (IPC)" metric={get("economy.inflation_cpi")} />
          <MetricCard label="Chômage (estimation OIT)" metric={get("labour.unemployment_ilo")} />
        </KpiGrid>
      </section>

      {slices.length > 0 && total ? (
        <section className={styles.card} aria-labelledby="structure-title">
          <SectionHeading id="structure-title" icon="chart">
            Structure de l&apos;économie : valeur ajoutée par branche
          </SectionHeading>
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
              Principales branches : {top.map(({ share }) => `${share.label} (${share.value} %)`).join(", ")}. Valeur ajoutée brute totale de {total.period} : {total.value} {total.unit}. Chaque part
              est calculée (valeur ajoutée de la branche ÷ valeur ajoutée totale) à partir de deux observations de la source citée ; la définition, le périmètre et la période de chaque branche
              figurent dans son détail. La valeur ajoutée n&apos;est ni le PIB ni la part de l&apos;emploi.
            </p>
          </>
        </section>
      ) : null}

      {vintages.length > 0 ? <ElectricitySection vintages={vintages} importDependency={get("energy.import_dependency")} /> : null}

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
          <p className={styles.cardNote}>
            Ressource présente, production nationale, importation et dépendance étrangère sont des notions distinctes : chaque chiffre porte sa définition, son année et sa source.
          </p>
          <div className={styles.cardGrid}>
            {module.resources.map((resource) => (
              <ItemCard key={resource.id} item={resource} sources={sources} visual={{ media, demoActive, icon: iconForTopic(resource.title, "gem"), hue: 160 }} />
            ))}
          </div>
        </section>
      ) : null}

      <ComplementPanels panels={complements} />

      {module.sectors.length + module.resources.length === 0 && !module.map ? (
        <section className={styles.card} aria-labelledby="todo-title">
          <SectionHeading id="todo-title" icon="factory">
            À venir dans cet onglet
          </SectionHeading>
          <p className={styles.cardNote}>
            Secteurs stratégiques, ports et infrastructures (couches de carte avec jeu de données, licence et date), commerce extérieur (statistiques douanières et bases internationales), matières premières : chaque
            rubrique sera publiée avec ses sources lues et sa licence vérifiée, et reste absente tant que ce n&apos;est pas le cas.
          </p>
        </section>
      ) : null}
    </div>
  );
}
