// Prototype du Lot 2 (Supervision V1) : bibliothèque de modules. Module pur, sans réseau ni base.
// Tailles en cellules de la grille de bureau (12 colonnes) ; voir layout.ts pour les autres largeurs.

export type ModuleKind = "summary" | "map" | "feed" | "timeline" | "alerts" | "stats" | "assistant" | "notes";

export interface ModuleDef {
  kind: ModuleKind;
  label: string;
  /** Une ligne pour le bandeau de modules. */
  description: string;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  /** Les six modules de visualisation prioritaires et les deux modules complémentaires (cahier des charges, section 4). */
  group: "visualisation" | "complément";
}

export const MODULES: readonly ModuleDef[] = [
  { kind: "summary", label: "Résumé exécutif", description: "Situation, faits marquants, limites", defaultW: 6, defaultH: 5, minW: 3, minH: 3, group: "visualisation" },
  { kind: "map", label: "Carte", description: "Événements géolocalisés", defaultW: 6, defaultH: 6, minW: 3, minH: 3, group: "visualisation" },
  { kind: "feed", label: "Flux d'informations", description: "Publications et événements", defaultW: 4, defaultH: 6, minW: 3, minH: 3, group: "visualisation" },
  { kind: "timeline", label: "Chronologie", description: "Faits dans leur succession", defaultW: 6, defaultH: 4, minW: 3, minH: 3, group: "visualisation" },
  { kind: "alerts", label: "Alertes", description: "Événements prioritaires", defaultW: 4, defaultH: 4, minW: 3, minH: 3, group: "visualisation" },
  { kind: "stats", label: "Statistiques", description: "Volumes et répartitions", defaultW: 4, defaultH: 4, minW: 3, minH: 3, group: "visualisation" },
  { kind: "assistant", label: "Assistant analytique", description: "Interroger la Supervision", defaultW: 4, defaultH: 6, minW: 3, minH: 4, group: "complément" },
  { kind: "notes", label: "Notes et analyses", description: "Notes humaines et analyses enregistrées", defaultW: 4, defaultH: 5, minW: 3, minH: 3, group: "complément" },
];

export function moduleDef(kind: ModuleKind): ModuleDef {
  const def = MODULES.find((entry) => entry.kind === kind);
  if (!def) throw new Error(`Module inconnu : ${kind}`);
  return def;
}

export function isModuleKind(value: unknown): value is ModuleKind {
  return typeof value === "string" && MODULES.some((entry) => entry.kind === value);
}
