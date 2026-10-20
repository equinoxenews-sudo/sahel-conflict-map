import type { ReactNode } from "react";
import InvestigationLogin from "@/components/investigation/InvestigationLogin";
import InvestigationShell from "@/components/investigation/InvestigationShell";
import { adminConfigured, isAdmin } from "@/lib/adminAuth";
import { InvestigationProvider } from "@/lib/investigation/InvestigationContext";

export const metadata = {
  title: "Investigation — Équinoxe News",
  description: "Outil d'investigation OSINT : recherche, dossiers, graphe relationnel, notes et boîte à outils.",
  // Un espace de travail privé : rien à indexer.
  robots: { index: false, follow: false },
};

// L'espace Investigation est protégé par le mot de passe du site (variable ADMIN_PASSWORD, la même que
// pour l'administration et la copie en ligne des dossiers) : un cookie httpOnly de sept jours. En production,
// sans mot de passe configuré, l'accès reste fermé ; en développement local sans mot de passe, il est ouvert.
export default async function InvestigationLayout({ children }: { children: ReactNode }) {
  const configured = adminConfigured();
  const open = (await isAdmin()) || (!configured && process.env.NODE_ENV !== "production");
  if (!open) return <InvestigationLogin configured={configured} />;

  return (
    <InvestigationProvider>
      <InvestigationShell>{children}</InvestigationShell>
    </InvestigationProvider>
  );
}
