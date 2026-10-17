import type { ChartSpec } from "@/lib/articleBlocks";
import styles from "./ArticleBlocks.module.css";

// Graphique d'un article premium : une seule série, une seule échelle.
// Barres horizontales (libellés longs lisibles) ou courbe ; chaque valeur est écrite,
// et le survol rappelle libellé, valeur et unité.

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function tip(spec: ChartSpec, label: string, value: number): string {
  return `${label} : ${number.format(value)}${spec.unite ? ` ${spec.unite}` : ""}`;
}

function Bars({ spec }: { spec: ChartSpec }) {
  const max = Math.max(...spec.donnees.map(([, v]) => Math.abs(v)), 1);
  return (
    <div className={styles.bars} role="list">
      {spec.donnees.map(([label, value], i) => (
        <div key={i} className={styles.barRow} role="listitem" title={tip(spec, label, value)}>
          <span className={styles.barLabel}>{label}</span>
          <span className={styles.barTrack}>
            <span className={styles.bar} style={{ width: `${Math.max(1, (Math.abs(value) / max) * 100)}%` }} />
            <span className={styles.barValue}>{number.format(value)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Line({ spec }: { spec: ChartSpec }) {
  const W = 720;
  const H = 260;
  const pad = { l: 16, r: 16, t: 28, b: 48 };
  const values = spec.donnees.map(([, v]) => v);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, min + 1);
  const n = spec.donnees.length;
  const x = (i: number) => pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const path = spec.donnees.map(([, v], i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className={styles.line} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={spec.titre}>
      <line x1={pad.l} x2={W - pad.r} y1={y(min)} y2={y(min)} className={styles.axis} />
      <path d={path} className={styles.linePath} />
      {spec.donnees.map(([label, value], i) => (
        <g key={i}>
          <title>{tip(spec, label, value)}</title>
          <circle cx={x(i)} cy={y(value)} r={12} className={styles.hit} />
          <circle cx={x(i)} cy={y(value)} r={4.5} className={styles.dot} />
          <text x={x(i)} y={y(value) - 10} textAnchor="middle" className={styles.lineValue}>
            {number.format(value)}
          </text>
          <text x={x(i)} y={H - pad.b + 20} textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"} className={styles.lineLabel}>
            {label.length > 22 ? `${label.slice(0, 21)}…` : label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function ArticleChart({ spec }: { spec: ChartSpec }) {
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.chartTitle}>
        {spec.titre}
        {spec.unite ? <span className={styles.unit}> ({spec.unite})</span> : null}
      </figcaption>
      {spec.type === "courbe" ? <Line spec={spec} /> : <Bars spec={spec} />}
      {spec.source && <p className={styles.source}>Source : {spec.source}</p>}
    </figure>
  );
}
