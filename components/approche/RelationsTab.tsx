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

export default function RelationsTab({ metrics, pending, relations, map, presenceMap, sources }: RelationsTabProps) {
  const get = (key: string) => metrics.get(key) ?? null;
  const missingFor = (key: string) => (pending.has(key) ? "À vérifier sur la source officielle" : "Donnée non disponible");
  // Une catégorie sans relation vérifiée ne prend pas une colonne entière : elle est résumée sur une ligne.
  const groups = COLUMNS.map((column) => ({ column, items: relations.filter((relation) => relation.type === column.type) }));
  const filled = groups.filter((group) => group.items.length > 0);
  const empty = groups.filter((group) => group.items.length === 0);

  return (
    <div className={styles.tabBody}>
      <section className={styles.card} aria-labelledby="orgs-title">
        <SectionHeading id="orgs-title" icon="globe">
          Positionnement international : organisations
        </SectionHeading>
        <div className={styles.rows}>
          <MetricCard variant="row" label="ONU — Conseil de sécurité" metric={get("institutions.unsc")} missing={missingFor("institutions.unsc")} />
          {get("institutions.eec_founding") ? <MetricCard variant="row" label="Communauté économique européenne" metric={get("institutions.eec_founding")} /> : null}
          <MetricCard variant="row" label="Union européenne" metric={get("institutions.eu_membership")} />
          <MetricCard variant="row" label="Zone euro" metric={get("institutions.euro_area")} />
          <MetricCard variant="row" label="Espace Schengen" metric={get("institutions.schengen")} />
          <MetricCard variant="row" label="OTAN" metric={get("institutions.nato")} />
          <MetricCard variant="row" label="G7" metric={get("institutions.g7")} />
          <MetricCard variant="row" label="G20" metric={get("institutions.g20")} />
          <MetricCard variant="row" label="OCDE" metric={get("institutions.oecd")} />
          <MetricCard variant="row" label="Francophonie (OIF)" metric={get("institutions.oif")} missing={missingFor("institutions.oif")} />
        </div>
        <p className={styles.cardNote}>Le G7 et le G20 sont des forums, non des organisations fondées sur un traité. Aucune organisation n&apos;est présentée comme une alliance militaire sans source qui le dise. Les emblèmes ne sont affichés que lorsque leur licence le permet : à défaut, le nom de l&apos;organisation.</p>
      </section>

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
        <p className={styles.cardNote}>Ce ne sont pas des classements « amis / rivaux » : une relation peut avoir plusieurs dimensions (traité, coopération, divergence), chacune avec ses dates et ses sources.</p>
      </section>

      <section className={styles.card} aria-labelledby="network-title">
        <SectionHeading id="network-title" data={map} icon="building">
          Réseau diplomatique
        </SectionHeading>
        {map ? <p className={styles.cardNote}>Postes institutionnels (ambassades, consulats, représentations permanentes) : une implantation par point, distincts des engagements documentés plus bas.</p> : null}
        {map ? (
          <ApprocheMap map={map} sources={sources} />
        ) : (
          <p className={styles.cardNote}>
            Non affiché pour l&apos;instant : le réseau d&apos;ambassades et de consulats exige un annuaire officiel dont la réutilisation est vérifiée. Aucun nombre de postes ni gradient d&apos;« influence » n&apos;est repris de la maquette.
          </p>
        )}
      </section>

      {presenceMap ? (
        <section className={styles.card} aria-labelledby="presence-title">
          <SectionHeading id="presence-title" data={presenceMap} icon="globe">
            Présences et engagements documentés
          </SectionHeading>
          <p className={styles.cardNote}>Faits et engagements documentés (accords, missions, implantations publiques, territoires). Cette carte n&apos;est pas une mesure d&apos;influence : chaque point renvoie à un fait daté, sans zone dessinée.</p>
          <ApprocheMap map={presenceMap} sources={sources} />
        </section>
      ) : null}
    </div>
  );
}
