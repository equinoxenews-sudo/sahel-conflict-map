import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/equinoxe/Header";
import { spaceAccount } from "@/lib/adminAuth";
import { canOpenSection } from "@/lib/espaceAccess";

export const metadata: Metadata = { title: "Prototype Supervision — EQUINOXE News", robots: { index: false, follow: false } };

export default async function LabIndexPage() {
  const space = await spaceAccount();
  if (!canOpenSection(space?.account ?? null, "supervision")) notFound();
  const card = { display: "block", padding: 18, borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--bg-panel)", color: "var(--text-primary)", textDecoration: "none" } as const;
  return (
    <>
      <Header />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "28px 16px 60px", color: "var(--text-primary)" }}>
        <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Supervision V1 — Lot 2 : prototype du tableau de bord</h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Même démonstration, deux moteurs de grille. Données entièrement fictives, aucune base de données, aucun appel IA. Chaque moteur garde sa propre
          sauvegarde dans ce navigateur, pour comparer à disposition égale.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 18 }}>
          <Link href="/supervision-lab/gridstack" style={card}>
            <strong>GridStack 14</strong>
            <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>Wrapper React officiel, mode « composant ».</p>
          </Link>
          <Link href="/supervision-lab/rgl" style={card}>
            <strong>React Grid Layout 2</strong>
            <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>Grille contrôlée par notre état, API de crochets React.</p>
          </Link>
        </div>
      </main>
    </>
  );
}
