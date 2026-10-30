import type { ComponentProps, ReactNode } from "react";
import { spaceAccount } from "@/lib/adminAuth";
import type { EspaceSection } from "@/lib/espace";
import { sectionView } from "@/lib/espaceAccess";
import ComingSoon from "./ComingSoon";

type SoonText = Pick<ComponentProps<typeof ComingSoon>, "title" | "summary" | "points">;

/**
 * Porte d'une rubrique réservée (lib/espaceAccess.ts). Le droit est vérifié ICI, sur le serveur, à chaque affichage de la
 * page : sans droit, le contenu réel n'est ni construit ni envoyé au navigateur, seule la page « Bientôt » l'est. Le menu
 * n'est qu'un affichage, il ne protège rien.
 */
export default async function SectionGate({ section, soon, children }: { section: EspaceSection; soon: SoonText; children: ReactNode }) {
  const space = await spaceAccount();
  if (sectionView(space?.account ?? null, section) === "content") return <>{children}</>;
  return <ComingSoon section={section} {...soon} />;
}
