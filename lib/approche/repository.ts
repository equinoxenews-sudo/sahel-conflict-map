import FRA from "@/data/approche/FRA.json";
import FRA_WORLDBANK from "@/data/approche/FRA.worldbank.json";
import { CountryDataSchema, type CountryData } from "./schema";
import { publishProblems } from "./sourceRegistry";

// Fiches « Approche » migrées vers le modèle sourcé : un fichier saisi à la main (identité, affirmations, sources
// institutionnelles) et un fichier produit par scripts/sync-approche-worldbank.ts. Ajouter un pays = ajouter ses deux
// fichiers dans data/approche/ puis les deux lignes ci-dessous. Un pays absent de cette liste garde l'ancienne fiche.
const FILES: Record<string, { curated: unknown; worldbank?: unknown }> = {
  FRA: { curated: FRA, worldbank: FRA_WORLDBANK },
};

interface WorldBankFile {
  sources?: unknown[];
  observations?: unknown[];
}

/**
 * La fiche d'un pays au nouveau modèle, ou null si le pays n'est pas migré, si le fichier est invalide ou si sa
 * publication est refusée (source exclue par licence, observation sans source…). Le refus est journalisé, jamais affiché.
 */
export function getApprocheData(iso3: string | undefined): CountryData | null {
  const entry = iso3 ? FILES[iso3.toUpperCase()] : undefined;
  if (!entry) return null;
  const curated = entry.curated as { sources?: unknown[]; observations?: unknown[] };
  const worldbank = (entry.worldbank ?? {}) as WorldBankFile;
  const merged = {
    ...curated,
    sources: [...(curated.sources ?? []), ...(worldbank.sources ?? [])],
    observations: [...(curated.observations ?? []), ...(worldbank.observations ?? [])],
  };
  const parsed = CountryDataSchema.safeParse(merged);
  if (!parsed.success) {
    console.error(`Approche ${iso3} : fichier invalide`, parsed.error.issues.slice(0, 3));
    return null;
  }
  const problems = publishProblems(parsed.data);
  if (problems.length > 0) {
    console.error(`Approche ${iso3} : publication refusée`, problems.slice(0, 5));
    return null;
  }
  return parsed.data;
}
