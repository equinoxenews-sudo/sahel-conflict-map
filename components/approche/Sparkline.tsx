interface SparklineProps {
  series: { period: string; value: number }[];
  label: string;
}

// Courbe des valeurs réelles d'une série (jamais décorative). Moins de trois points : rien n'est dessiné.
export default function Sparkline({ series, label }: SparklineProps) {
  if (series.length < 3) return null;
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 96;
  const height = 28;
  const points = series.map((point, index) => `${((index / (series.length - 1)) * width).toFixed(1)},${(height - 3 - ((point.value - min) / span) * (height - 6)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={`${label} : de ${series[0].period} à ${series[series.length - 1].period}`}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
