import type { ConflictEvent } from "./event";

export interface EntityRef {
  name: string;
  type: "Government" | "Military" | "Organization" | "Armed group" | "Foreign actor";
  country?: string;
  role?: string;
  /** Future: link out to a real entity/dossier page once one exists. */
  href?: string;
}

export interface LocationRef {
  name: string;
  note?: string;
}

export interface Infrastructure {
  name: string;
  type: "Port" | "Aéroport" | "Route" | "Chemin de fer" | "Pipeline" | "Énergie" | "Télécommunications" | "Base";
  location: string;
  importance: "Stratégique" | "Régionale" | "Locale";
  status: "Actif" | "Endommagé" | "Hors service" | "Inconnu";
  source?: string;
}

export interface CountrySource {
  id: string;
  title: string;
  publisher?: string;
  url?: string;
  type: "institutional" | "media" | "osint" | "database" | "other";
  publishedAt?: string;
  accessedAt?: string;
  /** 1-5, analyst-assigned — same spirit as lib/reliability.ts, not computed here. */
  reliability?: number;
  notes?: string;
}

export interface CountryProfile {
  id: string;
  slug: string;
  zoneSlug: string;
  name: string;
  officialName?: string;
  iso2?: string;
  iso3?: string;
  capital?: string;
  population?: string;
  area?: string;
  languages?: string[];
  currency?: string;
  government?: string;
  timezone?: string;

  overview?: {
    summary?: string;
    majorCities?: string[];
    neighbors?: string[];
    coastline?: string;
    territorialOrganization?: string;
    context?: string[];
  };

  politics?: {
    system?: string;
    headOfState?: string;
    headOfGovernment?: string;
    parliament?: string;
    constitution?: string;
    actors?: EntityRef[];
    foreignRelations?: string[];
  };

  security?: {
    overview?: string;
    conflicts?: string[];
    armedActors?: EntityRef[];
    foreignPresence?: EntityRef[];
    hotspots?: LocationRef[];
  };

  economy?: {
    gdp?: string;
    growth?: string;
    inflation?: string;
    mainSectors?: string[];
    resources?: string[];
    constraints?: string[];
  };

  infrastructures?: Infrastructure[];

  society?: {
    overview?: string;
    urbanization?: string;
    displacement?: string;
    languages?: string[];
    religions?: string[];
    communities?: string[];
  };

  environment?: {
    overview?: string;
    risks?: string[];
  };

  keyActors?: EntityRef[];
  relatedEvents?: ConflictEvent[];
  sources: CountrySource[];
  updatedAt: string;
}
