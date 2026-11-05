import { DemoFileSchema, type Modules } from "./modules";

// Données de DÉMONSTRATION des fiches « Approche » : contenu fictif qui sert uniquement à valider l'interface. Garde-fous :
//  - elles vivent dans data/approche-demo/, séparées des données réelles ;
//  - elles ne sont chargées que si NEXT_PUBLIC_APPROCHE_DEMO vaut « 1 », variable posée dans Vercel pour l'environnement
//    « Preview » seulement : sans elle, le code de chargement est supprimé du build ;
//  - un build de production avec cette variable échoue (voir plus bas) ;
//  - chaque élément chargé porte `demo: true`, et une fiche réelle qui en contiendrait un est refusée à la publication
//    (lib/approche/sourceRegistry.ts).

const DEMO_FLAG = process.env.NEXT_PUBLIC_APPROCHE_DEMO === "1";

if (DEMO_FLAG && process.env.VERCEL_ENV === "production") {
  throw new Error("NEXT_PUBLIC_APPROCHE_DEMO est activée en production : les données de démonstration ne doivent jamais y figurer.");
}

export function demoEnabled(): boolean {
  return DEMO_FLAG;
}

/** Marque `demo: true` tout objet identifiable (qui porte un `id`), à tous les niveaux. */
export function markDemo<T>(value: T): T {
  if (Array.isArray(value)) return value.map(markDemo) as unknown as T;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, markDemo(child)] as const);
    const marked = Object.fromEntries(entries);
    if (typeof (value as { id?: unknown }).id === "string") marked.demo = true;
    return marked as T;
  }
  return value;
}

/** Valide un fichier de démonstration et marque tout son contenu ; lève une erreur lisible s'il est invalide. */
export function parseDemoFile(raw: unknown): { countryCode: string; modules: Modules } {
  const parsed = DemoFileSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Fichier de démonstration invalide : ${parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join(".")} (${issue.message})`).join(" ; ")}`);
  return { countryCode: parsed.data.countryCode, modules: markDemo(parsed.data.modules) };
}

/** Modules de démonstration d'un pays, ou null si la démonstration n'est pas activée ou n'existe pas pour ce pays. */
export async function getDemoModules(iso3: string | undefined): Promise<Modules | null> {
  if (!DEMO_FLAG || !iso3) return null;
  if (iso3.toUpperCase() !== "FRA") return null;
  const file = (await import("@/data/approche-demo/FRA.demo.json")).default;
  return parseDemoFile(file).modules;
}

/** Vide : absent, liste vide, ou objet dont tous les champs sont vides (ex. un SWOT sans aucune ligne). */
const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isEmpty);
  return false;
};

/**
 * Fusionne les modules réels et ceux de démonstration, champ par champ : un champ réel renseigné l'emporte toujours, la
 * démonstration ne comble que ce qui manque. Les deux ne sont jamais mélangés dans un même élément.
 */
export function mergeModules(real: Modules | undefined, demo: Modules | null): Modules {
  const merged: Record<string, unknown> = {};
  const names = new Set([...Object.keys(real ?? {}), ...Object.keys(demo ?? {})]);
  for (const name of names) {
    const r = ((real ?? {}) as Record<string, Record<string, unknown> | null | undefined>)[name] ?? {};
    const d = ((demo ?? {}) as Record<string, Record<string, unknown> | null | undefined>)[name] ?? {};
    const fields: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(r), ...Object.keys(d)])) fields[key] = isEmpty(r[key]) && !isEmpty(d[key]) ? d[key] : r[key] ?? d[key];
    merged[name] = fields;
  }
  return merged as Modules;
}

/** Vrai si un élément de démonstration figure quelque part dans ce morceau de données. */
export function containsDemo(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsDemo);
  if (value && typeof value === "object") return (value as { demo?: unknown }).demo === true || Object.values(value as Record<string, unknown>).some(containsDemo);
  return false;
}
