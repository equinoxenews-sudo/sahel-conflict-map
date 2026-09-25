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

// Populated zone by zone, same pattern as lib/zoneHubContent.ts — a zone
// with no entry here just keeps the existing DocumentGrid behavior on its
// Approche tab (see app/zones/[slug]/[tab]/page.tsx).
export const ZONE_APPROCHE_CONTENT: Partial<Record<string, ZoneApprocheContent>> = {
  "amerique-du-sud": {
    categories: [
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
        description: "Amazonie, climat et risques naturels",
      },
    ],
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
};

export function getZoneApprocheContent(zoneSlug: string): ZoneApprocheContent | undefined {
  return ZONE_APPROCHE_CONTENT[zoneSlug];
}
