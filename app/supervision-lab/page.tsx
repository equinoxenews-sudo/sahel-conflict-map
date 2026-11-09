import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/equinoxe/Header";
import LabClient from "@/components/supervision/LabClient";
import { spaceAccount } from "@/lib/adminAuth";
import { canOpenSection } from "@/lib/espaceAccess";

// Prototype du Lot 2 de la Supervision V1 : tableau de bord modulaire (React Grid Layout 2), données ENTIÈREMENT fictives, aucune base,
// aucun appel IA. Réservé au compte du fondateur comme la rubrique Supervision, non référencé.
export const metadata: Metadata = { title: "Prototype Supervision — EQUINOXE News", robots: { index: false, follow: false } };

// Le site entier est calculé sur 980 px de large sur téléphone (voir app/layout.tsx) : ici on prend la vraie largeur de l'écran,
// sinon le téléphone afficherait la disposition de bureau réduite et on ne pourrait pas juger le comportement mobile.
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function LabPage() {
  const space = await spaceAccount();
  if (!canOpenSection(space?.account ?? null, "supervision")) notFound();
  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh" }}>
        <p style={{ maxWidth: 1480, margin: "0 auto", padding: "12px 16px 0", fontSize: 13, color: "var(--text-secondary)" }}>
          Prototype : données fictives, aucune base, aucun appel IA.
        </p>
        <LabClient />
      </main>
    </>
  );
}
