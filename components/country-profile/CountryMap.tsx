import type { CountryMapData } from "@/lib/countryMaps";
import styles from "./CountryMap.module.css";

interface CountryMapProps {
  data: CountryMapData;
}

// Structured so a later pass can add more SVG layers on top (zones of
// control, military bases, armed-group areas, event markers) without
// touching this base rendering — each would just be another mapped list
// of <circle>/<path> elements alongside `cities`.
export default function CountryMap({ data }: CountryMapProps) {
  return (
    <div className={styles.mapBox}>
      <svg viewBox={data.viewBox} className={styles.svg} role="img" aria-label={`Carte de ${data.main.name} et pays voisins`}>
        {data.neighbors.map((n) => (
          <path key={n.id} d={n.path} className={styles.neighbor}>
            <title>{n.name}</title>
          </path>
        ))}
        <path d={data.main.path} className={styles.main}>
          <title>{data.main.name}</title>
        </path>

        {data.neighbors.map((n) => (
          <text key={`label-${n.id}`} x={n.label[0]} y={n.label[1]} className={styles.neighborLabel}>
            {n.name}
          </text>
        ))}
        <text x={data.main.label[0]} y={data.main.label[1]} className={styles.mainLabel}>
          {data.main.name}
        </text>

        {data.cities.map((city) => (
          <g key={city.name}>
            <circle cx={city.point[0]} cy={city.point[1]} r={3} className={styles.city} />
            <text x={city.point[0] + 6} y={city.point[1] + 3} className={styles.cityLabel}>
              {city.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
