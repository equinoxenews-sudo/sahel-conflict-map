import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/equinoxe/Header";
import LabClient from "@/components/supervision-lab/LabClient";
import { spaceAccount } from "@/lib/adminAuth";
import { canOpenSection } from "@/lib/espaceAccess";

// Prototype du Lot 2 de la Supervision V1 : tableau de bord modulaire, données ENTIÈREMENT fictives, aucune base, aucun appel IA.
// Réservé au compte du fondateur comme la rubrique Supervision, non référencé.
export const metadata: Metadata = { title: "Prototype Supervision — EQUINOXE News", robots: { index: false, follow: false } };

// Le site entier est calculé sur 980 px de large sur téléphone (voir app/layout.tsx) : ici on prend la vraie largeur de l'écran,
// sinon le téléphone afficherait la disposition de bureau réduite et on ne pourrait pas juger le comportement mobile.
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const ENGINES = ["gridstack", "rgl"] as const;

export function generateStaticParams() {
  return ENGINES.map((engine) => ({ engine }));
}

export default async function LabEnginePage({ params }: { params: Promise<{ engine: string }> }) {
  const { engine } = await params;
  if (!(ENGINES as readonly string[]).includes(engine)) notFound();
  const space = await spaceAccount();
  if (!canOpenSection(space?.account ?? null, "supervision")) notFound();
  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh" }}>
        <p style={{ maxWidth: 1480, margin: "0 auto", padding: "12px 16px 0", fontSize: 13, color: "var(--text-secondary)" }}>
          <Link href="/supervision-lab" style={{ color: "var(--accent-gold-bright)" }}>← Comparatif des deux moteurs</Link> · Prototype : données fictives, aucune base, aucun appel IA.
        </p>
        <LabClient engine={engine as (typeof ENGINES)[number]} />
      </main>
    </>
  );
}
