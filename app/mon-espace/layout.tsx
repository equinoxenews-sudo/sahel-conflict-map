import type { ReactNode } from "react";
import EspaceShell from "@/components/espace/EspaceShell";
import InvestigationLogin from "@/components/investigation/InvestigationLogin";
import { adminConfigured, privateAccessOpen } from "@/lib/adminAuth";
import { InvestigationProvider } from "@/lib/investigation/InvestigationContext";

// La protection dépend du cookie de connexion : cet espace n'est jamais préparé à l'avance ni mis en cache, chaque
// visite est vérifiée (sans cela, un build sans mot de passe configuré pourrait figer la page ouverte).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mon espace — Équinoxe News",
  description: "Espace privé : dossiers, notes, graphes de relations, recherche, supervision, suivi et outils OSINT.",
  // Un espace de travail privé : rien à indexer.
  robots: { index: false, follow: false },
};

// « Mon espace » est réservé au compte du site (identifiant Nicof + variable ADMIN_PASSWORD, comme pour
// l'administration et la copie en ligne des dossiers) : cookie httpOnly de sept jours. Non connecté, la page de
// connexion s'affiche à la place. En production, sans mot de passe configuré, l'accès reste fermé ; en développement
// local sans mot de passe, il est ouvert.
export default async function MonEspaceLayout({ children }: { children: ReactNode }) {
  if (!(await privateAccessOpen())) return <InvestigationLogin configured={adminConfigured()} title="Mon espace" />;

  return (
    <InvestigationProvider>
      <EspaceShell>{children}</EspaceShell>
    </InvestigationProvider>
  );
}
