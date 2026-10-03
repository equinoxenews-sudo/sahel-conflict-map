import { stripMarkup } from "@/lib/citationTags";
import type { ZoneSynthesis } from "@/lib/zoneSynthesis";
import styles from "./ZoneSynthesisPanel.module.css";

interface ZoneSynthesisPanelProps {
  zoneName: string;
  synthesis: ZoneSynthesis | null;
}

const updatedAtFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

// Synthèse politico-sécuritaire de la zone rédigée par l'agent IA
// (scripts/zone-synthesis.ts, chaque jour à 9 h si de nouvelles synthèses
// sont arrivées). Tant qu'aucune n'existe, le panneau le dit sans afficher
// de faux contenu.
export default function ZoneSynthesisPanel({ zoneName, synthesis }: ZoneSynthesisPanelProps) {
  if (!synthesis) {
    return (
      <section className={styles.panel} aria-label={`Synthèse ${zoneName}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Synthèse — {zoneName}</h2>
          <span className={styles.status}>Bientôt disponible</span>
        </div>
        <p className={styles.text}>
          Un agent IA analyse nos articles et des sources ouvertes pour proposer ici une synthèse des
          événements politico-sécuritaires de la zone, mise à jour chaque jour à 9 h si nécessaire.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-label={`Synthèse ${zoneName}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Synthèse — {zoneName}</h2>
        <span className={styles.meta}>Mise à jour le {updatedAtFormat.format(new Date(synthesis.generated_at))}</span>
      </div>
      <p className={styles.headline}>{stripMarkup(synthesis.headline)}</p>
      {synthesis.sections.map((section) => (
        <div key={section.heading} className={styles.section}>
          <h3 className={styles.sectionHeading}>{section.heading}</h3>
          <p className={styles.text}>{stripMarkup(section.body)}</p>
        </div>
      ))}
      {synthesis.sources.length > 0 ? (
        <details className={styles.sources}>
          <summary>Sources ({synthesis.sources.length})</summary>
          <ul>
            {synthesis.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>{" "}
                <span className={styles.domain}>{source.domain}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className={styles.disclaimer}>
        Synthèse générée par IA à partir des articles Équinoxe
        {synthesis.used_web_search ? " et de sources ouvertes" : " uniquement (pas de recherche web)"} ; à recouper avec les
        sources citées.
      </p>
    </section>
  );
}
