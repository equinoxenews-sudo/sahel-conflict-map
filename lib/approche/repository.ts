import { COUNTRY_FILES } from "./registry.generated";
import { CountryDataSchema, type CountryData } from "./schema";
import { isVisible, publishProblems } from "./sourceRegistry";

// Fiches « Approche » migrées vers le modèle sourcé : un fichier saisi à la main (identité, affirmations, sources
// institutionnelles) et des fichiers produits par scripts/sync-approche-worldbank.ts (et -eurostat). Le registre des pays est GÉNÉRÉ
// à partir de data/approche/ (registry.generated.ts) : ajouter un pays = `npm run approche:import`, sans toucher à ce fichier. Un pays
// absent du registre garde l'ancienne fiche.
const FILES = COUNTRY_FILES;

interface WorldBankFile {
  sources?: unknown[];
  observations?: unknown[];
}

/** Pays migrés et publiables (pour pré-rendre leurs pages au déploiement). */
export function listApprocheCountries(): { slug: string; zoneSlug: string }[] {
  return Object.keys(FILES).flatMap((iso3) => {
    const data = getApprocheData(iso3);
    return data ? [{ slug: data.slug, zoneSlug: data.zoneSlug }] : [];
  });
}

/**
 * La fiche d'un pays au nouveau modèle, fichiers fusionnés et validés, que sa publication soit un brouillon ou non (pour les contrôles
 * et les tests) ; null si le pays n'est pas migré, si le fichier est invalide ou si sa publication est refusée (source exclue par
 * licence, observation sans source…). Le refus est journalisé, jamais affiché.
 */
export function loadApprocheCountry(iso3: string | undefined): CountryData | null {
  const entry = iso3 ? FILES[iso3.toUpperCase()] : undefined;
  if (!entry) return null;
  const curated = entry.curated as { sources?: unknown[]; observations?: unknown[] };
  const extras = [entry.worldbank, entry.eurostat].map((file) => (file ?? {}) as WorldBankFile);
  const merged = {
    ...curated,
    sources: [...(curated.sources ?? []), ...extras.flatMap((file) => file.sources ?? [])],
    observations: [...(curated.observations ?? []), ...extras.flatMap((file) => file.observations ?? [])],
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

/** La fiche servie au public : un brouillon hors Preview garde son ancienne fiche, rien du nouveau modèle n'est servi. */
export function getApprocheData(iso3: string | undefined): CountryData | null {
  const data = loadApprocheCountry(iso3);
  return data && isVisible(data) ? data : null;
}
