import type { Account } from "./accounts";
import type { EspaceSection } from "./espace";

// Droits d'accès aux rubriques de « Mon espace ». Module pur (testé dans tests/espace-access.test.ts).
// Investigation, Supervision et Tracking sont réservés au compte du fondateur (offre « owner ») : les autres comptes
// voient la page « Bientôt ». Le jour où une rubrique s'ouvre à une offre, il suffit de l'ajouter ici.

/** Rubriques et offres autorisées. Une rubrique absente de cette liste est ouverte à tout compte connecté. */
const RESTRICTED: Partial<Record<EspaceSection, readonly Account["tier"][]>> = {
  investigation: ["owner"],
  supervision: ["owner"],
  tracking: ["owner"],
};

/** Le compte (null : personne) peut-il ouvrir cette rubrique ? */
export function canOpenSection(account: Pick<Account, "tier"> | null, section: EspaceSection): boolean {
  if (!account) return false;
  const allowed = RESTRICTED[section];
  return allowed ? allowed.includes(account.tier) : true;
}

/** Les rubriques que ce compte ne peut pas ouvrir (elles restent dans le menu, avec la pastille « Bientôt »). */
export function lockedSections(account: Pick<Account, "tier"> | null, sections: readonly EspaceSection[]): EspaceSection[] {
  return sections.filter((section) => !canOpenSection(account, section));
}

/** Ce que doit afficher la page d'une rubrique : son contenu, ou la page « Bientôt ». Décidé sur le serveur (SectionGate). */
export function sectionView(account: Pick<Account, "tier"> | null, section: EspaceSection): "content" | "soon" {
  return canOpenSection(account, section) ? "content" : "soon";
}

export interface AccountNavItem {
  key: EspaceSection;
  label: string;
  href: string;
  /** Vrai : la rubrique n'est pas ouverte à ce compte (pastille « Bientôt » dans le menu, jamais d'accès actif). */
  locked: boolean;
}

/** Le menu de gauche tel que ce compte le voit. */
export function navForAccount(account: Pick<Account, "tier"> | null, items: readonly { key: EspaceSection; label: string; href: string }[]): AccountNavItem[] {
  return items.map((item) => ({ ...item, locked: !canOpenSection(account, item.key) }));
}
