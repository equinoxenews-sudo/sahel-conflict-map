import CountryFlag from "@/components/country-profile/CountryFlag";
import type { HeroModule, MediaAsset } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import OrgBadge from "./OrgBadge";
import Visual from "./Visual";
import styles from "./Approche.module.css";

interface HeroProps {
  name: string;
  officialName?: string | null;
  iso2?: string;
  /** Région affichée au-dessus du nom (ex. nom de la zone). */
  region: string;
  hero: HeroModule | null | undefined;
  asset: MediaAsset | null | undefined;
  demoActive: boolean;
  /** Phrases vérifiées de la fiche (affirmations publiées) : la synthèse affichée. */
  statements: string[];
  metrics: Map<string, MetricView>;
}

/** Appartenances proposées en badges : jamais affichées si leur statut n'est pas vérifié. */
const BADGES: { key: string; label: string }[] = [
  { key: "institutions.eu_membership", label: "Union européenne" },
  { key: "institutions.nato", label: "OTAN" },
  { key: "institutions.unsc", label: "ONU · Conseil de sécurité" },
  { key: "institutions.g7", label: "G7" },
  { key: "institutions.g20", label: "G20" },
  { key: "institutions.oecd", label: "OCDE" },
  { key: "institutions.oif", label: "Francophonie" },
];

// En-tête immersif d'un pays : image panoramique (ou visuel neutre), dégradé de lecture, drapeau, nom, positionnement, synthèse et
// badges d'organisations. Générique : tout vient des données (hero, médias, observations) ; rien n'est propre à un pays.
export default function Hero({ name, officialName, iso2, region, hero, asset, demoActive, statements, metrics }: HeroProps) {
  const summary = statements.length > 0 ? statements.join(" ") : hero?.summary;
  return (
    <header className={styles.hero}>
      <Visual asset={asset} demoActive={demoActive} icon="globe" hue={215} priority sizes="100vw" caption className={styles.heroImage} />
      <div className={styles.heroShade} aria-hidden />
      <div className={styles.heroContent}>
        <span className={styles.heroRegion}>{region}</span>
        <div className={styles.heroTitle}>
          <CountryFlag iso2={iso2} name={name} />
          <div>
            <h1>{name}</h1>
            {officialName ? <p className={styles.officialName}>{officialName}</p> : null}
          </div>
        </div>
        {hero?.tagline ? <p className={styles.heroTagline}>{hero.tagline}</p> : null}
        {summary ? <p className={styles.dek}>{summary}</p> : null}
        <div className={styles.badgeRow}>
          {BADGES.flatMap(({ key, label }) => {
            const metric = metrics.get(key);
            return metric ? [<OrgBadge key={key} label={label} metric={metric} />] : [];
          })}
        </div>
      </div>
    </header>
  );
}
