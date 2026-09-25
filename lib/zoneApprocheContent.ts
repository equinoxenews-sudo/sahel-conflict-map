import type { ApprocheCategoryKey } from "@/components/zone-approche/ApprocheCategoryIcon";

export interface ApprocheCategory {
  key: ApprocheCategoryKey;
  title: string;
  description: string;
}

export interface ApprocheDossier {
  slug: string;
  title: string;
  description: string;
  /** CSS gradient — placeholder until real photography is sourced (see project notes). */
  gradient: string;
}

export interface ZoneApprocheContent {
  categories: ApprocheCategory[];
  dossiers: ApprocheDossier[];
}

// Reused identically across every zone (user-confirmed) — only the
// descriptions' regional flavor text below varies per zone.
const STANDARD_CATEGORIES: ApprocheCategory[] = [
  {
    key: "geopolitique",
    title: "Géopolitique",
    description: "Relations régionales et influences extérieures",
  },
  {
    key: "securite",
    title: "Sécurité",
    description: "Acteurs armés et criminalité organisée",
  },
  {
    key: "economie",
    title: "Économie & ressources",
    description: "Énergie, minerais et échanges",
  },
  {
    key: "infrastructures",
    title: "Infrastructures",
    description: "Ports, corridors et réseaux",
  },
  {
    key: "societes",
    title: "Sociétés",
    description: "Population, migrations et dynamiques sociales",
  },
  {
    key: "environnement",
    title: "Environnement",
    description: "Climat et risques naturels",
  },
];

// Populated zone by zone, same pattern as lib/zoneHubContent.ts — a zone
// with no entry here just keeps the existing DocumentGrid behavior on its
// Approche tab (see app/zones/[slug]/[tab]/page.tsx). Dossiers transversaux
// are editorial picks (3 recurring cross-cutting themes per zone).
export const ZONE_APPROCHE_CONTENT: Partial<Record<string, ZoneApprocheContent>> = {
  "amerique-du-sud": {
    // Kept verbatim per the original mockup spec (its Environnement text
    // names Amazonie explicitly) rather than the generic wording below.
    categories: STANDARD_CATEGORIES.map((c) =>
      c.key === "environnement" ? { ...c, description: "Amazonie, climat et risques naturels" } : c
    ),
    dossiers: [
      {
        slug: "amazonie",
        title: "Amazonie",
        description: "Enjeux stratégiques, préservation et développement durable",
        gradient: "linear-gradient(135deg, #163425 0%, #0d2418 60%, #08150e 100%)",
      },
      {
        slug: "andes-minerais",
        title: "Andes et minerais stratégiques",
        description: "Ressources, acteurs et recompositions régionales",
        gradient: "linear-gradient(135deg, #2a3542 0%, #1a222c 60%, #0f151c 100%)",
      },
      {
        slug: "plateau-guyanes",
        title: "Plateau des Guyanes",
        description: "Ressources, biodiversité et dynamiques frontalières",
        gradient: "linear-gradient(135deg, #123331 0%, #0b201f 60%, #071413 100%)",
      },
    ],
  },

  europe: {
    categories: STANDARD_CATEGORIES,
    dossiers: [
      {
        slug: "flanc-oriental-otan",
        title: "Flanc oriental de l'OTAN",
        description: "Posture militaire, dissuasion et tensions avec la Russie",
        gradient: "linear-gradient(135deg, #263544 0%, #17222d 60%, #0e151b 100%)",
      },
      {
        slug: "balkans-occidentaux",
        title: "Balkans occidentaux",
        description: "Stabilité fragile, intégration européenne et tensions ethniques",
        gradient: "linear-gradient(135deg, #34293f 0%, #201a28 60%, #131019 100%)",
      },
      {
        slug: "energie-dependance-russe",
        title: "Énergie et dépendance russe",
        description: "Sécurité énergétique, gazoducs et diversification",
        gradient: "linear-gradient(135deg, #4a3a1e 0%, #2c2312 60%, #1a150b 100%)",
      },
    ],
  },

  "moyen-orient": {
    categories: STANDARD_CATEGORIES,
    dossiers: [
      {
        slug: "levant-conflit-israelo-palestinien",
        title: "Levant et conflit israélo-palestinien",
        description: "Gaza, Cisjordanie, Liban et équilibres régionaux",
        gradient: "linear-gradient(135deg, #4a3a24 0%, #2c2315 60%, #191308 100%)",
      },
      {
        slug: "golfe-arabo-persique",
        title: "Golfe arabo-persique",
        description: "Rivalité Iran-Arabie saoudite, pétrole et détroit d'Ormuz",
        gradient: "linear-gradient(135deg, #103334 0%, #0a2021 60%, #061414 100%)",
      },
      {
        slug: "guerres-civiles-etats-fragiles",
        title: "Guerres civiles et États fragiles",
        description: "Syrie, Yémen, Irak : reconstruction et acteurs armés",
        gradient: "linear-gradient(135deg, #402420 0%, #271512 60%, #170c0a 100%)",
      },
    ],
  },

  afrique: {
    categories: STANDARD_CATEGORIES,
    dossiers: [
      {
        slug: "sahel",
        title: "Sahel",
        description: "Coups d'État, jihadisme et recompositions sécuritaires",
        gradient: "linear-gradient(135deg, #4a3d1e 0%, #2c2512 60%, #1a160b 100%)",
      },
      {
        slug: "corne-de-l-afrique",
        title: "Corne de l'Afrique",
        description: "Conflits, sécheresse et rivalités régionales",
        gradient: "linear-gradient(135deg, #452c1e 0%, #2a1b12 60%, #19110b 100%)",
      },
      {
        slug: "grands-lacs",
        title: "Grands Lacs",
        description: "RD Congo, Rwanda et groupes armés transfrontaliers",
        gradient: "linear-gradient(135deg, #1e3d2a 0%, #12251a 60%, #0b160f 100%)",
      },
    ],
  },

  indopacifique: {
    categories: STANDARD_CATEGORIES,
    dossiers: [
      {
        slug: "mer-de-chine-meridionale",
        title: "Mer de Chine méridionale",
        description: "Tensions territoriales et routes maritimes stratégiques",
        gradient: "linear-gradient(135deg, #123244 0%, #0b1f2c 60%, #07131a 100%)",
      },
      {
        slug: "peninsule-coreenne",
        title: "Péninsule coréenne",
        description: "Dénucléarisation, tensions et diplomatie régionale",
        gradient: "linear-gradient(135deg, #2a3038 0%, #1a1e23 60%, #101215 100%)",
      },
      {
        slug: "detroit-de-taiwan",
        title: "Détroit de Taiwan",
        description: "Tensions Chine-Taiwan et équilibres militaires",
        gradient: "linear-gradient(135deg, #123a2e 0%, #0b241d 60%, #071510 100%)",
      },
    ],
  },
};

export function getZoneApprocheContent(zoneSlug: string): ZoneApprocheContent | undefined {
  return ZONE_APPROCHE_CONTENT[zoneSlug];
}
