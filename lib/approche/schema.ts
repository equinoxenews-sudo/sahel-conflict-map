import { z } from "zod";

// Modèle de données des fiches pays « Approche » : chaque valeur affichée est une observation qui renvoie à une ou plusieurs
// sources (organisme, adresse exacte, licence, date de consultation) et porte son unité, sa période de référence, son périmètre
// et sa méthode. Les fiches sont des fichiers JSON du dépôt (data/approche/<ISO3>.json et <ISO3>.worldbank.json), validés ici
// avant publication ; rien n'est inventé : une donnée absente reste absente.

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?$/, "date AAAA-MM-JJ attendue");

/**
 * Droits de réutilisation commerciale d'une source. `commercial_license_required` : exclue de toute collecte, import ou
 * actualisation automatique tant qu'une autorisation écrite n'est pas obtenue (c'est le cas de SIPRI, y compris quand ses
 * indicateurs sont redistribués par une autre plateforme).
 */
export const REUSE = ["allowed", "unknown", "commercial_license_required"] as const;
export type Reuse = (typeof REUSE)[number];

export const SourceSchema = z.object({
  id: z.string().min(1),
  publisher: z.string().min(1),
  title: z.string().min(1),
  /** Adresse exacte de la page, de la série ou du rapport (pas la page d'accueil de l'organisme). */
  canonicalUrl: z.string().url(),
  apiUrl: z.string().url().nullable().optional(),
  datasetId: z.string().nullable().optional(),
  datasetVersion: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  accessedAt: DATE,
  license: z.string().nullable(),
  reuse: z.enum(REUSE),
  methodNotes: z.string().nullable().optional(),
  language: z.string().default("fr"),
});

export const STATUS = ["verified", "pending", "stale", "conflicting", "rejected"] as const;
export const DATA_KIND = ["observed", "calculated", "official_statement", "editorial_analysis"] as const;

export const ObservationSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(3),
  /** Clé stable, ex. `demography.population`. */
  key: z.string().min(1),
  /** Regroupe plusieurs mesures d'un même sujet (ex. la population selon deux organismes). */
  topic: z.string().nullable().optional(),
  value: z.union([z.number(), z.string(), z.boolean()]).nullable(),
  unit: z.string().nullable(),
  currency: z.string().nullable().optional(),
  /** Période de la valeur : « 2025 », « 2025-T4 »… Jamais vide : aucun nombre sans année. */
  referencePeriod: z.string().min(1),
  geographicScope: z.string().min(1),
  methodology: z.string().min(1),
  sourceIds: z.array(z.string()).min(1),
  collectedAt: DATE,
  verifiedAt: DATE.nullable(),
  status: z.enum(STATUS),
  dataKind: z.enum(DATA_KIND),
  calculationFormula: z.string().nullable().optional(),
  /** Valeurs des périodes précédentes, de la plus ancienne à la plus récente (pour les courbes). */
  history: z.array(z.object({ period: z.string(), value: z.number() })).default([]),
});

export const ClaimSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(3),
  statement: z.string().min(1),
  claimType: z.enum(["fact", "attributed_position", "analysis", "scenario"]),
  sourceIds: z.array(z.string()).min(1),
  validAsOf: z.string().min(1),
  reviewer: z.string().nullable(),
  status: z.enum(["verified", "pending", "stale", "contested"]),
  caveats: z.array(z.string()).default([]),
});

export const PUBLICATION = ["draft", "review", "published", "archived"] as const;

/** Une fiche pays : identité, sources, observations et affirmations. */
export const CountryDataSchema = z.object({
  countryCode: z.string().length(3),
  slug: z.string().min(1),
  zoneSlug: z.string().min(1),
  name: z.string().min(1),
  officialName: z.string().nullable().optional(),
  publication: z.enum(PUBLICATION),
  /** Dernier contrôle de la fiche, même sans changement. */
  lastCheckedAt: DATE.nullable(),
  sources: z.array(SourceSchema),
  observations: z.array(ObservationSchema),
  claims: z.array(ClaimSchema).default([]),
});

export type SourceRecord = z.infer<typeof SourceSchema>;
export type Observation = z.infer<typeof ObservationSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type CountryData = z.infer<typeof CountryDataSchema>;
