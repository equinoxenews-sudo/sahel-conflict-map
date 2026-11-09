"use client";

import dynamic from "next/dynamic";

// La grille touche au DOM : toute la démonstration est rendue côté navigateur uniquement.
const LabShell = dynamic(() => import("./LabShell"), { ssr: false, loading: () => <p style={{ padding: 24 }}>Chargement du prototype…</p> });

export default function LabClient() {
  return <LabShell />;
}
