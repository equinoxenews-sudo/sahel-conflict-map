import europe from "@/data/country-profiles/europe.json";
import type { CountryProfile } from "@/types/country";
import { getCountryProfile } from "./countries";

// Fiches pays renseignées par lots (un fichier JSON par zone dans
// data/country-profiles/). Le fichier TypeScript de chaque pays ne sert plus
// que de squelette d'identité ; le contenu vient du lot. Les données vivent
// hors du code pour qu'une mise à jour n'exige plus de toucher aux fichiers
// TypeScript, et se transposent telles quelles en lignes Supabase.
//
// Module réservé au serveur : le lot pèse plusieurs centaines de Ko et ne
// doit pas rejoindre le code envoyé au navigateur (lib/countries y est déjà).
interface CountryPackage {
  package: string;
  countries: Record<string, unknown>[];
}

const PACKAGES = [europe] as unknown as CountryPackage[];

// Ces champs identifient le pays dans le reste du site (routes, carte, drapeau) :
// le dépôt fait foi, le lot ne les remplace jamais. (Ex. Kosovo : la carte
// utilise l'identifiant « CS-KM », le lot « XKX ».)
const IDENTITY_KEYS = ["id", "slug", "zoneSlug", "name", "iso2", "iso3"] as const;

/** Retire les `null` du lot : une valeur nulle signifie « pas encore
 * renseigné », jamais « vide à afficher ». */
function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripNulls) as unknown as T;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [k, stripNulls(v)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

const OVERLAYS = new Map<string, Record<string, unknown>>();
for (const pkg of PACKAGES) {
  for (const country of pkg.countries) {
    if (typeof country.slug === "string") OVERLAYS.set(country.slug, stripNulls(country));
  }
}

/** Fiche issue d'un lot : identité du dépôt + contenu du lot. */
export function applyCountryOverlay(base: CountryProfile, overlay: Record<string, unknown>): CountryProfile {
  const identity = Object.fromEntries(IDENTITY_KEYS.flatMap((key) => (base[key] !== undefined ? [[key, base[key]]] : [])));
  const lastUpdatedAt = typeof overlay.lastUpdatedAt === "string" ? overlay.lastUpdatedAt : undefined;
  return {
    ...overlay,
    ...identity,
    sources: Array.isArray(overlay.sources) ? overlay.sources : [],
    updatedAt: lastUpdatedAt ?? base.updatedAt,
  } as unknown as CountryProfile;
}

/** Fiche d'un pays, complétée par son lot s'il en existe un ; sinon la fiche
 * du dépôt telle quelle (contenu de démonstration). */
export function getResolvedCountryProfile(slug: string): CountryProfile | undefined {
  const base = getCountryProfile(slug);
  if (!base) return undefined;
  const overlay = OVERLAYS.get(base.slug) ?? OVERLAYS.get(slug);
  return overlay ? applyCountryOverlay(base, overlay) : base;
}

/** Vrai si la fiche vient d'un lot contrôlé (et non du contenu de démonstration). */
export function isIntegratedProfile(country: CountryProfile): boolean {
  return country.lastCheckedAt !== undefined;
}
