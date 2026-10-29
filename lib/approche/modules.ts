import { z } from "zod";

// Modules optionnels d'une fiche pays (schéma version 1) : cartes, défense, enjeux, vulnérabilités, éléments de la vue
// d'ensemble et de l'économie. Un pays peut n'en fournir aucun, quelques-uns ou tous : l'interface affiche ce qui existe.
// Les mêmes schémas servent aux données réelles (chaque élément cite au moins une source) et aux données de démonstration
// (dossier data/approche-demo/, jamais publiées : `demo: true`). Les chiffres affichés peuvent renvoyer à une observation
// sourcée (`observationKey`), sinon ils sont du texte déclaré (`valueText`) qui doit porter ses propres sources.

export const SCHEMA_VERSION = 1;

const sourceIds = z.array(z.string()).default([]);
const demoFlag = z.boolean().default(false);
const text = z.string().min(1);

// --- Cartes ----------------------------------------------------------------------------------------------------------------

export const MAP_THEMES = ["defense", "economy", "relations", "interests", "risks", "infrastructure"] as const;
export type MapTheme = (typeof MAP_THEMES)[number];

export const MapFeatureSchema = z.object({
  id: text,
  name: text,
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** Nature de l'objet (« Base permanente », « Port »…), affichée dans la bulle. */
  kind: text,
  summary: z.string().default(""),
  /** « Actif », « Clôturé »… : une opération terminée n'est jamais présentée comme en cours. */
  status: z.string().nullable().optional(),
  /** Adresse de la page officielle de l'objet, si elle existe. */
  url: z.string().url().nullable().optional(),
  sourceIds,
  demo: demoFlag,
});

export const MapLayerSchema = z.object({
  id: text,
  title: text,
  theme: z.enum(MAP_THEMES),
  /** Couleur de la légende (hexadécimal). */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string().default(""),
  attribution: z.string().default(""),
  license: z.string().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  lastUpdatedAt: z.string().nullable().optional(),
  features: z.array(MapFeatureSchema),
  demo: demoFlag,
});

export const MapViewSchema = z.object({ lat: z.number(), lon: z.number(), zoom: z.number().min(1).max(14) });

export const MapModuleSchema = z.object({
  id: text,
  title: text,
  /** Cartes proposées dans un onglet : `layers` sont les couches sélectionnables. */
  view: MapViewSchema,
  layers: z.array(MapLayerSchema),
  note: z.string().default(""),
});

// --- Éléments communs -----------------------------------------------------------------------------------------------------

export const ItemSchema = z.object({
  id: text,
  title: text,
  summary: z.string().default(""),
  tags: z.array(z.string()).default([]),
  /** Date ou année de l'élément (chronologie, calendrier). */
  date: z.string().nullable().optional(),
  /** « prévu », « annoncé », « réalisé » pour un calendrier ; libre sinon. */
  status: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  sourceIds,
  demo: demoFlag,
});

export const KpiSchema = z.object({
  id: text,
  label: text,
  /** Si présent : la valeur vient de cette observation sourcée (clé de `observations`). */
  observationKey: z.string().nullable().optional(),
  /** Sinon : texte déclaré, avec sa période et ses sources. */
  valueText: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  period: z.string().nullable().optional(),
  note: z.string().default(""),
  sourceIds,
  demo: demoFlag,
});

// --- Vue d'ensemble ---------------------------------------------------------------------------------------------------------

export const OverviewModuleSchema = z.object({
  /** Atouts et défis : des appréciations analytiques sourcées, pas des faits statistiques. */
  strengths: z.array(ItemSchema).default([]),
  challenges: z.array(ItemSchema).default([]),
  timeline: z.array(ItemSchema).default([]),
});

// --- Économie ---------------------------------------------------------------------------------------------------------------

export const EconomyModuleSchema = z.object({
  sectors: z.array(ItemSchema).default([]),
  resources: z.array(ItemSchema).default([]),
  map: MapModuleSchema.nullable().optional(),
});

// --- Relations --------------------------------------------------------------------------------------------------------------

export const RelationsModuleSchema = z.object({
  /** Carte du réseau diplomatique, des organisations ou des partenariats documentés. */
  map: MapModuleSchema.nullable().optional(),
});

// --- Défense et sécurité ----------------------------------------------------------------------------------------------------

export const OrgNodeSchema = z.object({
  id: text,
  label: text,
  parentId: z.string().nullable(),
  note: z.string().default(""),
  sourceIds,
  demo: demoFlag,
});

export const EquipmentSchema = ItemSchema.extend({
  category: z.string().default(""),
  /** Nombre en service à une date précise : ne se renseigne que s'il est vérifié (observation ou texte daté). */
  inServiceText: z.string().nullable().optional(),
});

export const ThreatPostureSchema = z.object({
  /** Dispositif officiel (ex. un plan de vigilance publié), jamais un « niveau » inventé. */
  system: text,
  level: text,
  validFrom: z.string().nullable().optional(),
  note: z.string().default(""),
  sourceIds,
  demo: demoFlag,
});

export const DefenseModuleSchema = z.object({
  kpis: z.array(KpiSchema).default([]),
  organization: z.array(OrgNodeSchema).default([]),
  missions: z.array(ItemSchema).default([]),
  framework: z.array(ItemSchema).default([]),
  /** Opérations et engagements, datés ; `layerId` / `featureId` les relient à la carte. */
  operations: z.array(ItemSchema.extend({ layerId: z.string().nullable().optional(), featureId: z.string().nullable().optional() })).default([]),
  equipment: z.array(EquipmentSchema).default([]),
  industry: z.array(ItemSchema).default([]),
  partnerships: z.array(ItemSchema).default([]),
  internalSecurity: z.array(ItemSchema).default([]),
  threatPosture: ThreatPostureSchema.nullable().optional(),
  strengths: z.array(ItemSchema).default([]),
  map: MapModuleSchema.nullable().optional(),
});

// --- Enjeux stratégiques ----------------------------------------------------------------------------------------------------

export const SCOPES = ["national", "european", "international"] as const;

export const IssueSchema = ItemSchema.extend({
  /** Horizon justifié (« 3–10 ans ») ; l'ordre des dossiers n'est pas un classement. */
  horizon: z.string().nullable().optional(),
  /** Portée en étiquettes, jamais en pourcentages. */
  scope: z.array(z.enum(SCOPES)).default([]),
  subthemes: z.array(z.string()).default([]),
  situation: z.string().default(""),
  whyStrategic: z.string().default(""),
  actors: z.array(z.string()).default([]),
  indicators: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
});

export const IssuesModuleSchema = z.object({
  issues: z.array(IssueSchema).default([]),
  calendar: z.array(ItemSchema).default([]),
  opportunities: z.array(ItemSchema).default([]),
  risks: z.array(ItemSchema).default([]),
  kpis: z.array(KpiSchema).default([]),
  map: MapModuleSchema.nullable().optional(),
});

// --- Vulnérabilités et perspectives -----------------------------------------------------------------------------------------

export const DependencySchema = ItemSchema.extend({
  /** « needs_methodology » : description qualitative seulement, aucun pourcentage affiché ; « measured » : renvoie à une observation. */
  state: z.enum(["needs_methodology", "measured"]).default("needs_methodology"),
  observationKey: z.string().nullable().optional(),
});

export const ScenarioSchema = ItemSchema.extend({
  /** « reinforcement » | « pressure » | « fragility » : jamais de probabilité chiffrée tant qu'aucun modèle n'est publié. */
  kind: z.enum(["reinforcement", "pressure", "fragility"]),
  assumptions: z.array(z.string()).default([]),
  triggers: z.array(z.string()).default([]),
  weakSignals: z.array(z.string()).default([]),
  consequences: z.array(z.string()).default([]),
  limits: z.array(z.string()).default([]),
});

export const OutlookModuleSchema = z.object({
  domains: z.array(ItemSchema).default([]),
  dependencies: z.array(DependencySchema).default([]),
  swot: z
    .object({
      strengths: z.array(ItemSchema).default([]),
      weaknesses: z.array(ItemSchema).default([]),
      opportunities: z.array(ItemSchema).default([]),
      threats: z.array(ItemSchema).default([]),
    })
    .default({ strengths: [], weaknesses: [], opportunities: [], threats: [] }),
  scenarios: z.array(ScenarioSchema).default([]),
  watchAxes: z.array(ItemSchema).default([]),
  timeline: z.array(ItemSchema).default([]),
  map: MapModuleSchema.nullable().optional(),
});

// --- Ensemble ---------------------------------------------------------------------------------------------------------------

export const ModulesSchema = z.object({
  overview: OverviewModuleSchema.nullable().optional(),
  relations: RelationsModuleSchema.nullable().optional(),
  economy: EconomyModuleSchema.nullable().optional(),
  defense: DefenseModuleSchema.nullable().optional(),
  issues: IssuesModuleSchema.nullable().optional(),
  outlook: OutlookModuleSchema.nullable().optional(),
});

/** Fichier de démonstration : uniquement des modules, tous marqués `demo`. */
export const DemoFileSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  countryCode: z.string().length(3),
  demo: z.literal(true),
  modules: ModulesSchema,
});

export type MapFeature = z.infer<typeof MapFeatureSchema>;
export type MapLayer = z.infer<typeof MapLayerSchema>;
export type MapModule = z.infer<typeof MapModuleSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Kpi = z.infer<typeof KpiSchema>;
export type Modules = z.infer<typeof ModulesSchema>;
export type DefenseModule = z.infer<typeof DefenseModuleSchema>;
export type IssuesModule = z.infer<typeof IssuesModuleSchema>;
export type OutlookModule = z.infer<typeof OutlookModuleSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type DemoFile = z.infer<typeof DemoFileSchema>;
export type OverviewModule = z.infer<typeof OverviewModuleSchema>;
export type EconomyModule = z.infer<typeof EconomyModuleSchema>;
export type RelationsModule = z.infer<typeof RelationsModuleSchema>;
