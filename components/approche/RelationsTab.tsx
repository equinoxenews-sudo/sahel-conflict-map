import type { MetricView, RelationView } from "@/lib/approche/view";
import MetricCard from "./MetricCard";
import RelationCard from "./RelationCard";
import styles from "./Approche.module.css";

interface RelationsTabProps {
  metrics: Map<string, MetricView>;
  pending: Set<string>;
  relations: RelationView[];
}

const COLUMNS: { type: RelationView["type"]; title: string; empty: string }[] = [
  { type: "treaty", title: "Alliances et obligations conventionnelles", empty: "Aucune entrée vérifiée pour l'instant." },
  { type: "cooperation", title: "Coopérations et partenariats", empty: "Aucune entrée vérifiée pour l'instant." },
  { type: "tension", title: "Divergences et tensions documentées", empty: "Aucune entrée vérifiée pour l'instant : une divergence n'est publiée qu'avec un fait daté et sa source." },
];

export default function RelationsTab({ metrics, pending, relations }: RelationsTabProps) {
  const get = (key: string) => metrics.get(key) ?? null;
  const missingFor = (key: string) => (pending.has(key) ? "À vérifier sur la source officielle" : "Donnée non disponible");

  return (
    <div className={styles.tabBody}>
      <section className={styles.card} aria-labelledby="orgs-title">
        <h2 id="orgs-title">Organisations internationales</h2>
        <div className={styles.rows}>
          <MetricCard variant="row" label="ONU — Conseil de sécurité" metric={get("institutions.unsc")} missing={missingFor("institutions.unsc")} />
          <MetricCard variant="row" label="Union européenne" metric={get("institutions.eu_membership")} />
          <MetricCard variant="row" label="Zone euro" metric={get("institutions.euro_area")} />
          <MetricCard variant="row" label="Espace Schengen" metric={get("institutions.schengen")} />
          <MetricCard variant="row" label="OTAN" metric={get("institutions.nato")} />
          <MetricCard variant="row" label="G7" metric={get("institutions.g7")} />
          <MetricCard variant="row" label="G20" metric={get("institutions.g20")} />
          <MetricCard variant="row" label="OCDE" metric={get("institutions.oecd")} />
          <MetricCard variant="row" label="Francophonie (OIF)" metric={get("institutions.oif")} missing={missingFor("institutions.oif")} />
        </div>
        <p className={styles.cardNote}>Le G7 et le G20 sont des forums, non des organisations fondées sur un traité. Aucune organisation n&apos;est présentée comme une alliance militaire sans source qui le dise.</p>
      </section>

      <section aria-labelledby="bilateral-title">
        <h2 id="bilateral-title" className={styles.sectionTitle}>
          Relations bilatérales documentées
        </h2>
        <div className={styles.threeCols}>
          {COLUMNS.map((column) => {
            const items = relations.filter((relation) => relation.type === column.type);
            return (
              <div key={column.type} className={styles.card}>
                <h3 className={styles.colTitle}>{column.title}</h3>
                {items.length > 0 ? (
                  <div className={styles.relationList}>
                    {items.map((relation) => (
                      <RelationCard key={relation.id} relation={relation} />
                    ))}
                  </div>
                ) : (
                  <p className={styles.missing}>{column.empty}</p>
                )}
              </div>
            );
          })}
        </div>
        <p className={styles.cardNote}>Ce ne sont pas des classements « amis / rivaux » : une relation peut avoir plusieurs dimensions (traité, coopération, divergence), chacune avec ses dates et ses sources.</p>
      </section>

      <section className={styles.card} aria-labelledby="network-title">
        <h2 id="network-title">Réseau diplomatique et carte d&apos;influence</h2>
        <p className={styles.cardNote}>
          Non affiché pour l&apos;instant. Le réseau d&apos;ambassades et de consulats exige un annuaire officiel dont la réutilisation est vérifiée, et la carte d&apos;influence des indicateurs mesurables et sourcés ; aucun nombre de postes ni aucun gradient d&apos;« influence » n&apos;est repris de la maquette.
        </p>
      </section>
    </div>
  );
}
