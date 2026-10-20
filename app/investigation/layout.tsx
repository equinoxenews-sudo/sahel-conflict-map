import type { ReactNode } from "react";
import InvestigationLogin from "@/components/investigation/InvestigationLogin";
import InvestigationShell from "@/components/investigation/InvestigationShell";
import { adminConfigured, privateAccessOpen } from "@/lib/adminAuth";
import { InvestigationProvider } from "@/lib/investigation/InvestigationContext";

export const metadata = {
  title: "Investigation — Équinoxe News",
  description: "Outil d'investigation OSINT : recherche, dossiers, graphe relationnel, notes et boîte à outils.",
  // Un espace de travail privé : rien à indexer.
  robots: { index: false, follow: false },
};

// L'espace Investigation est réservé au compte du site (identifiant Nicof + variable ADMIN_PASSWORD, comme
// pour l'administration et la copie en ligne des dossiers) : un cookie httpOnly de sept jours. En production,
// sans mot de passe configuré, l'accès reste fermé ; en développement local sans mot de passe, il est ouvert.
export default async function InvestigationLayout({ children }: { children: ReactNode }) {
  if (!(await privateAccessOpen())) return <InvestigationLogin configured={adminConfigured()} />;

  return (
    <InvestigationProvider>
      <InvestigationShell>{children}</InvestigationShell>
    </InvestigationProvider>
  );
}
