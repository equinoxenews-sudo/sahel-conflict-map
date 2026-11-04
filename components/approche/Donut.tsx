interface DonutProps {
  slices: { id: string; label: string; value: number; color: string }[];
  /** Texte au centre (ex. total et année). */
  center?: string;
  label: string;
}

// Anneau de répartition dessiné à partir de valeurs réelles (jamais décoratif) ; la lecture complète reste dans la liste à côté.
export default function Donut({ slices, center, label }: DonutProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return null;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  // Longueur de chaque arc et décalage de départ (somme des arcs précédents), calculés sans modifier de variable pendant le rendu.
  const arcs = slices.map((slice, index) => ({
    slice,
    length: (slice.value / total) * circumference,
    start: slices.slice(0, index).reduce((sum, previous) => sum + (previous.value / total) * circumference, 0),
  }));
  return (
    <svg viewBox="0 0 140 140" width="160" height="160" role="img" aria-label={label}>
      <g transform="rotate(-90 70 70)">
        {arcs.map(({ slice, length, start }) => (
          <circle key={slice.id} cx="70" cy="70" r={radius} fill="none" stroke={slice.color} strokeWidth="18" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} />
        ))}
      </g>
      {center ? (
        <text x="70" y="74" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="600">
          {center}
        </text>
      ) : null}
    </svg>
  );
}
