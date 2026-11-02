"use client";

import { useState } from "react";
import { ELECTRICITY_KEYS } from "@/lib/approche/keys";
import { productionSegments, type ElectricityVintage } from "@/lib/approche/electricity";
import type { MetricView } from "@/lib/approche/view";
import Icon from "./Icon";
import KpiGrid from "./KpiGrid";
import MetricCard from "./MetricCard";
import styles from "./Approche.module.css";

interface ElectricitySectionProps {
  /** Millésimes disponibles, du plus récent au plus ancien : le plus récent est affiché par défaut. */
  vintages: ElectricityVintage[];
  /** Dépendance aux importations d'énergie : sa propre période, indépendante du millésime choisi. */
  importDependency: MetricView | null;
}

// Section « électricité » avec sélecteur de millésime. Chaque année est affichée seule, avec ses valeurs, ses dates et ses sources :
// une valeur absente d'une année n'est jamais complétée par celle d'une autre.
export default function ElectricitySection({ vintages, importDependency }: ElectricitySectionProps) {
  const [year, setYear] = useState(vintages[0]?.year ?? "");
  const vintage = vintages.find((candidate) => candidate.year === year) ?? vintages[0];
  if (!vintage) return null;

  const { metrics } = vintage;
  const production = productionSegments(vintage);
  const exportsGross = metrics.exports_gross ?? null;
  const imports = metrics.imports ?? null;
  const maxFlow = Math.max(exportsGross?.raw ?? 0, imports?.raw ?? 0, 1);
  const measures = ELECTRICITY_KEYS.flatMap((key) => (metrics[key] ? [metrics[key]] : []));
  const sources = [...new Map(measures.flatMap((metric) => metric.sources).map((source) => [source.id, source])).values()];
  const lowCarbonShare = metrics.low_carbon_share ?? null;

  return (
    <section className={styles.card} aria-labelledby="elec-title">
      <h2 id="elec-title" className={styles.sectionTitle}>
        <Icon name="bolt" size={20} />
        <span>Énergie : électricité (bilan {vintage.year})</span>
      </h2>
      {vintages.length > 1 ? (
        <div className={styles.vintageBar}>
          <span id="elec-vintage-label">Millésime</span>
          <div role="group" aria-labelledby="elec-vintage-label" className={styles.vintageButtons}>
            {vintages.map((candidate) => (
              <button key={candidate.year} type="button" aria-pressed={candidate.year === vintage.year} className={candidate.year === vintage.year ? `${styles.vintageButton} ${styles.vintageActive}` : styles.vintageButton} onClick={() => setYear(candidate.year)}>
                {candidate.year}
              </button>
            ))}
          </div>
          <small>Chaque année garde ses valeurs, ses dates et ses sources ; une valeur absente d&apos;une année n&apos;est jamais complétée par celle d&apos;une autre.</small>
        </div>
      ) : null}
      {production ? (
        <div className={styles.energyGrid}>
          <div>
            <h3 className={styles.colTitle}>Production d&apos;électricité par filière</h3>
            <div
              className={styles.stack}
              role="img"
              aria-label={`Production totale ${production.total} TWh en ${vintage.year} : ${production.segments.map((segment) => `${segment.label} ${segment.value.toFixed(1)} TWh`).join(", ")}`}
            >
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
            {exportsGross || imports ? <h3 className={styles.colTitle}>Échanges d&apos;électricité</h3> : null}
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
            <KpiGrid>
              <MetricCard label="Solde net exportateur" metric={metrics.net_exports ?? null} />
              <MetricCard label="Consommation (corrigée du climat)" metric={metrics.consumption ?? null} />
              {lowCarbonShare ? <MetricCard label="Part bas carbone de la production" metric={lowCarbonShare} /> : null}
              <MetricCard label="Dépendance aux importations d'énergie" metric={importDependency} />
            </KpiGrid>
          </div>
        </div>
      ) : (
        <p className={styles.missing}>Donnée non disponible pour {vintage.year}</p>
      )}
      <details className={styles.details}>
        <summary>
          <span>Voir les chiffres sourcés ({vintage.year})</span>
        </summary>
        <div className={styles.rows}>
          {measures.map((metric) => (
            <MetricCard key={metric.key} variant="row" label={metric.label || metric.key} metric={metric} />
          ))}
        </div>
      </details>
      <p className={styles.cardNote}>
        Source{sources.length > 1 ? "s" : ""} : {sources.map((source) => `${source.publisher}, ${source.title}`).join(" ; ")}. Il s&apos;agit de l&apos;électricité seule : ni le mix d&apos;énergie primaire, ni la consommation
        finale d&apos;énergie. Production, échanges, consommation et dépendance aux importations d&apos;énergie sont quatre notions distinctes, jamais additionnées ; la définition de la dépendance (tous produits
        énergétiques) figure dans son détail. Les parts « calculées » sont des différences entre valeurs publiées.
      </p>
    </section>
  );
}
