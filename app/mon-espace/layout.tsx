import type { ReactNode } from "react";
import InvestigationLogin from "@/components/investigation/InvestigationLogin";
import { adminConfigured, privateAccessOpen } from "@/lib/adminAuth";

export const metadata = {
  title: "Mon espace — Équinoxe News",
  robots: { index: false, follow: false },
};

// « Mon espace » est réservé au compte du site : connexion (identifiant + mot de passe) avant d'y entrer.
export default async function MonEspaceLayout({ children }: { children: ReactNode }) {
  if (!(await privateAccessOpen())) return <InvestigationLogin configured={adminConfigured()} title="Mon espace" />;
  return children;
}
