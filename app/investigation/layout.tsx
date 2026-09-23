import type { ReactNode } from "react";
import InvestigationShell from "@/components/investigation/InvestigationShell";
import { InvestigationProvider } from "@/lib/investigation/InvestigationContext";

export const metadata = {
  title: "Investigation — Équinoxe News",
  description: "Outil d'investigation OSINT : recherche, dossiers, graphe relationnel, notes et boîte à outils.",
};

export default function InvestigationLayout({ children }: { children: ReactNode }) {
  return (
    <InvestigationProvider>
      <InvestigationShell>{children}</InvestigationShell>
    </InvestigationProvider>
  );
}
