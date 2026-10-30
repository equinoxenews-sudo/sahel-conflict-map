import type { ReactNode } from "react";
import EspaceShell from "@/components/espace/EspaceShell";
import InvestigationLogin from "@/components/investigation/InvestigationLogin";
import { storageScopeOf } from "@/lib/accountScope";
import { loginAvailable, spaceAccount } from "@/lib/adminAuth";
import { ESPACE_NAV } from "@/lib/espace";
import { lockedSections } from "@/lib/espaceAccess";
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

// « Mon espace » est réservé aux comptes du site (le compte du fondateur Nicof + ADMIN_PASSWORD, et les comptes
// individuels de la table `accounts`) : cookie httpOnly de sept jours. Non connecté, la page de connexion s'affiche à la
// place. En production, sans connexion possible, l'accès reste fermé ; en développement local sans mot de passe, il est
// ouvert au nom du fondateur.
// Le SERVEUR décide ici, pour le compte reconnu : où vivent ses données dans le navigateur (portée), et quelles rubriques
// lui sont fermées (Investigation, Supervision, Tracking : voir lib/espaceAccess.ts ; chaque page les refuse aussi).
export default async function MonEspaceLayout({ children }: { children: ReactNode }) {
  const space = await spaceAccount();
  if (!space) return <InvestigationLogin configured={loginAvailable()} title="Mon espace" />;
  const { account, signedIn } = space;
  const scope = storageScopeOf(account);

  return (
    // La clé remonte tout l'espace (et son stockage local) si le compte change : jamais de données d'un compte chez un autre.
    <InvestigationProvider key={scope || "fondateur"} scope={scope} accountId={signedIn ? account.id : null}>
      <EspaceShell locked={lockedSections(account, ESPACE_NAV.map((item) => item.key))}>{children}</EspaceShell>
    </InvestigationProvider>
  );
}
