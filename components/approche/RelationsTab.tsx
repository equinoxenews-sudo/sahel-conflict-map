import type { MapModule } from "@/lib/approche/modules";
import type { MetricView, RelationView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import Icon from "./Icon";
import MetricCard from "./MetricCard";
import RelationCard from "./RelationCard";
import { SectionHeading, type SourceMap } from "./shared";
import styles from "./Approche.module.css";

interface RelationsTabProps {
  metrics: Map<string, MetricView>;
  pending: Set<string>;
  relations: RelationView[];
  map: MapModule | null | undefined;
  presenceMap: MapModule | null | undefined;
  sources: SourceMap;
}

const COLUMNS: { type: RelationView["type"]; title: string; icon: string; empty: string }[] = [
  { type: "treaty", title: "Alliances et obligations conventionnelles", icon: "scale", empty: "Aucune entrée vérifiée pour l'instant." },
  { type: "cooperation", title: "Coopérations et partenariats", icon: "handshake", empty: "Aucune entrée vérifiée pour l'instant." },
  { type: "tension", title: "Divergences et tensions documentées", icon: "warning", empty: "Aucune entrée vérifiée pour l'instant : une divergence n'est publiée qu'avec un fait daté et sa source." },
];

/** Organisations et cadres connus de l'interface, dans l'ordre d'affichage ; une ligne n'apparaît que si le fichier la documente (ou la signale à vérifier). */
const ORGANISATIONS = [
  { key: "institutions.unsc", label: "ONU — Conseil de sécurité" },
  { key: "institutions.eec_founding", label: "Communauté économique européenne" },
  { key: "institutions.eu_membership", label: "Union européenne" },
  { key: "institutions.euro_area", label: "Zone euro" },
  { key: "institutions.schengen", label: "Espace Schengen" },
  { key: "institutions.nato", label: "OTAN" },
  { key: "institutions.g7", label: "G7" },
  { key: "institutions.g20", label: "G20" },
  { key: "institutions.oecd", label: "OCDE" },
  { key: "institutions.oif", label: "Francophonie (OIF)" },
];

export default function RelationsTab({ metrics, pending, relations, map, presenceMap, sources }: RelationsTabProps) {
  const get = (key: string) => metrics.get(key) ?? null;
  const missingFor = (key: string) => (pending.has(key) ? "À vérifier sur la source officielle" : "Donnée non disponible");
  const organisations = ORGANISATIONS.filter(({ key }) => get(key) || pending.has(key));
  // Une catégorie sans relation vérifiée ne prend pas une colonne entière : elle est résumée sur une ligne.
  const groups = COLUMNS.map((column) => ({ column, items: relations.filter((relation) => relation.type === column.type) }));
  const filled = groups.filter((group) => group.items.length > 0);
  const empty = groups.filter((group) => group.items.length === 0);

  return (
    <div className={styles.tabBody}>
      {organisations.length > 0 ? (
        <section className={styles.card} aria-labelledby="orgs-title">
          <SectionHeading id="orgs-title" icon="globe">
            Positionnement international : organisations
          </SectionHeading>
          <div className={styles.rows}>
            {organisations.map(({ key, label }) => (
              <MetricCard key={key} variant="row" label={label} metric={get(key)} missing={missingFor(key)} />
            ))}
          </div>
          <p className={styles.cardNote}>
            {organisations.some(({ key }) => key === "institutions.g7" || key === "institutions.g20") ? "Le G7 et le G20 sont des forums, non des organisations fondées sur un traité. " : ""}
            Aucune organisation n&apos;est présentée comme une alliance militaire sans source qui le dise. Les emblèmes ne sont affichés que lorsque leur licence le permet : à défaut, le nom de
            l&apos;organisation.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="bilateral-title">
        <SectionHeading id="bilateral-title" icon="handshake">
          Relations bilatérales documentées
        </SectionHeading>
        {filled.length > 0 ? (
          <div className={filled.length === 1 ? `${styles.relGrid} ${styles.relGridSingle}` : styles.relGrid}>
            {filled.map(({ column, items }) => (
              <div key={column.type} className={`${styles.card} ${styles[`rel_${column.type}`]}`}>
                <h3 className={styles.colTitle}>
                  <Icon name={column.icon} size={16} />
                  {column.title}
                </h3>
                <div className={styles.relationList}>
                  {items.map((relation) => (
                    <RelationCard key={relation.id} relation={relation} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {empty.length > 0 ? (
          <ul className={styles.emptyCats}>
            {empty.map(({ column }) => (
              <li key={column.type}>
                <Icon name={column.icon} size={15} />
                <strong>{column.title}</strong>
                <span>{column.empty}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className={styles.cardNote}>
          Ce ne sont pas des classements « amis / rivaux » : une relation peut avoir plusieurs dimensions (traité, coopération, divergence), chacune avec ses dates et ses sources.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="network-title">
        <SectionHeading id="network-title" data={map} icon="building">
          Réseau diplomatique
        </SectionHeading>
        {map ? (
          <p className={styles.cardNote}>Postes institutionnels (ambassades, consulats, représentations permanentes) : une implantation par point, distincts des engagements documentés plus bas.</p>
        ) : null}
        {map ? (
          <ApprocheMap map={map} sources={sources} />
        ) : (
          <p className={styles.cardNote}>
            Non affiché pour l&apos;instant : le réseau d&apos;ambassades et de consulats exige un annuaire officiel dont la réutilisation est vérifiée. Aucun nombre de postes ni gradient d&apos;«
            influence » n&apos;est repris de la maquette.
          </p>
        )}
      </section>

      {presenceMap ? (
        <section className={styles.card} aria-labelledby="presence-title">
          <SectionHeading id="presence-title" data={presenceMap} icon="globe">
            Présences et engagements documentés
          </SectionHeading>
          <p className={styles.cardNote}>
            Faits et engagements documentés (accords, missions, implantations publiques, territoires). Cette carte n&apos;est pas une mesure d&apos;influence : chaque point renvoie à un fait daté,
            sans zone dessinée.
          </p>
          <ApprocheMap map={presenceMap} sources={sources} />
        </section>
      ) : null}
    </div>
  );
}
