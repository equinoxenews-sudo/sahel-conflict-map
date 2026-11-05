// Organisations du panneau pays : nom court, sigle et logo. Les logos sont des fichiers du domaine public (Wikimedia Commons, voir
// public/orgs/CREDITS.md) hébergés par nous, sans appel à un tiers. Sans logo, le panneau affiche le sigle dans l'hexagone.
// Ce sont des emblèmes d'organisations : usage éditorial ; à revérifier avant toute commercialisation (marques).

export interface OrgDefinition {
  /** Regroupe plusieurs clés de la même organisation (une seule ligne dans le panneau). */
  group: string;
  name: string;
  acronym: string;
  /** Chemin d'un logo dans public/orgs, ou null. */
  logo: string | null;
  /** Précision affichée sous le nom (statut particulier). */
  note?: string;
}

const org = (group: string, name: string, acronym: string, logo: string | null, note?: string): OrgDefinition => ({ group, name, acronym, logo, note });

/** Clés `institutions.*` des fiches Approche. Une clé absente d'ici n'est pas affichée (jamais un libellé deviné). */
export const ORG_BY_KEY: Record<string, OrgDefinition | null> = {
  "institutions.aes": org("aes", "Confédération AES", "AES", null),
  "institutions.au": org("au", "Union africaine", "UA", "/orgs/au.svg"),
  "institutions.cemac": org("cemac", "CEMAC", "CEMAC", null),
  "institutions.commonwealth": org("commonwealth", "Commonwealth", "CW", "/orgs/commonwealth.svg"),
  "institutions.ecowas": org("ecowas", "CEDEAO", "CEDEAO", null),
  "institutions.ecowas_former_member": org("ecowas", "CEDEAO", "CEDEAO", null, "ancien membre"),
  "institutions.ecowas_suspended": org("ecowas", "CEDEAO", "CEDEAO", null, "suspendu"),
  // Fondateur de la CEE : déjà couvert par l'Union européenne.
  "institutions.eec_founding": null,
  "institutions.eu_membership": org("eu", "Union européenne", "UE", "/orgs/eu.svg"),
  "institutions.euro_area": org("euro", "Zone euro", "€", null),
  "institutions.g20": org("g20", "G20", "G20", null),
  "institutions.g7": org("g7", "G7", "G7", null),
  "institutions.mano_river_union": org("mru", "Union du fleuve Mano", "UFM", null),
  "institutions.nato": org("nato", "OTAN", "OTAN", "/orgs/nato.svg"),
  "institutions.oecd": org("oecd", "OCDE", "OCDE", null),
  "institutions.oif": org("oif", "Francophonie", "OIF", "/orgs/oif.svg"),
  "institutions.schengen": org("schengen", "Espace Schengen", "SCH", null),
  "institutions.uemoa": org("uemoa", "UEMOA", "UEMOA", "/orgs/uemoa.svg"),
  "institutions.unsc": org("un", "ONU", "ONU", "/orgs/un.svg", "Conseil de sécurité"),
  "institutions.unsc_2026_2027": org("un", "ONU", "ONU", "/orgs/un.svg", "Conseil de sécurité 2026-2027"),
  "institutions.unsc_permanent": org("un", "ONU", "ONU", "/orgs/un.svg", "Conseil de sécurité (membre permanent)"),
  "institutions.wto": org("wto", "OMC", "OMC", "/orgs/wto.svg"),
};

const BY_NAME: [RegExp, OrgDefinition][] = [
  [/cedeao|ecowas/i, org("ecowas", "CEDEAO", "CEDEAO", null)],
  [/nations unies|^onu\b|\bonu\b/i, org("un", "ONU", "ONU", "/orgs/un.svg")],
  [/union europ|^ue$/i, org("eu", "Union européenne", "UE", "/orgs/eu.svg")],
  [/otan|nato/i, org("nato", "OTAN", "OTAN", "/orgs/nato.svg")],
  [/union africaine/i, org("au", "Union africaine", "UA", "/orgs/au.svg")],
  [/aes|conf[ée]d[ée]ration des [ée]tats du sahel|alliance des [ée]tats du sahel/i, org("aes", "AES", "AES", null)],
  [/uemoa/i, org("uemoa", "UEMOA", "UEMOA", "/orgs/uemoa.svg")],
  [/francophonie|oif/i, org("oif", "Francophonie", "OIF", "/orgs/oif.svg")],
];

/** Organisation reconnue d'après le nom d'une cible de relation sans pays (« CEDEAO », « Nations unies / MINUSMA »…), sinon null. */
export function orgByName(name: string): OrgDefinition | null {
  return BY_NAME.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

/** Sigle de repli pour un nom d'organisation non reconnu : initiales en capitales, quatre lettres au plus. */
export function acronymOf(name: string): string {
  const letters = name
    .split(/[\s/'’-]+/)
    .filter((word) => word.length > 2 && /^[A-ZÀ-Ý]/.test(word))
    .map((word) => word[0])
    .join("");
  return (letters || name.slice(0, 3)).toUpperCase().slice(0, 4);
}
