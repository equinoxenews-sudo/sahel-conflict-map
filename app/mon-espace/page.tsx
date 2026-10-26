"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import DragScroll from "@/components/espace/DragScroll";
import { DossierTile, NewDossierTile } from "@/components/espace/DossierTile";
import { ESPACE_ROOT } from "@/lib/espace";
import { useDossiers } from "@/lib/investigation/InvestigationContext";
import styles from "./page.module.css";

function Block({ title, href, area, children }: { title: string; href: string; area: string; children: ReactNode }) {
  return (
    <section className={styles.block} style={{ gridArea: area }}>
      <Link href={href} className={styles.blockTitle}>
        {title}
      </Link>
      {children}
    </section>
  );
}

// MENU : la vue d'ensemble de l'espace. En haut, le fil d'actualité OSINT et IA (à brancher) ; dessous, un aperçu
// des dossiers de l'abonné, de sa supervision et de son suivi.
export default function EspaceMenuPage() {
  const dossiers = [...useDossiers()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className={styles.page}>
      <section className={styles.feed} aria-label="Actualité OSINT et IA">
        <span className={styles.feedKicker}>Fil d&apos;actualité · OSINT et intelligence artificielle</span>
        <p className={styles.feedText}>
          Les nouveautés sur l&apos;OSINT et l&apos;IA apparaîtront ici. Ce fil sera branché prochainement.
        </p>
      </section>

      <div className={styles.grid}>
        <Block title="Mes notes" href={`${ESPACE_ROOT}/notes`} area="notes">
          <DragScroll>
            {dossiers.map((dossier) => (
              <DossierTile key={dossier.id} dossier={dossier} view="notes" />
            ))}
            <NewDossierTile view="notes" />
          </DragScroll>
        </Block>

        <Block title="Ma supervision" href={`${ESPACE_ROOT}/supervision`} area="supervision">
          <div className={styles.emptyTile}>
            <span className={styles.emptyTitle}>Aucune enquête en cours</span>
            <Link href={`${ESPACE_ROOT}/supervision`} className={styles.emptyLink}>
              Ouvrir une enquête →
            </Link>
          </div>
        </Block>

        <Block title="Mes graph" href={`${ESPACE_ROOT}/graph`} area="graph">
          <DragScroll>
            {dossiers.map((dossier) => (
              <DossierTile key={dossier.id} dossier={dossier} view="graphe" />
            ))}
            <NewDossierTile view="graphe" />
          </DragScroll>
        </Block>

        <Block title="Mon tracking" href={`${ESPACE_ROOT}/tracking`} area="tracking">
          <div className={styles.emptyTile}>
            <span className={styles.emptyTitle}>Aucun suivi pour l&apos;instant</span>
            <span className={styles.emptyHint}>Navires et avions : bientôt.</span>
          </div>
        </Block>
      </div>
    </div>
  );
}
