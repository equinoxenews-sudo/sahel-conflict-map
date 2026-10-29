// Les six onglets d'une fiche « Approche » et leur adresse (?tab=…). Un onglet inconnu retombe sur la vue d'ensemble.
export const APPROCHE_TABS = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "relations", label: "Relations internationales" },
  { key: "economy", label: "Économie et ressources" },
  { key: "defense", label: "Défense et sécurité" },
  { key: "issues", label: "Enjeux stratégiques" },
  { key: "outlook", label: "Vulnérabilités et perspectives" },
] as const;

export type ApprocheTab = (typeof APPROCHE_TABS)[number]["key"];

export function validateTab(value: unknown): ApprocheTab {
  return APPROCHE_TABS.find((tab) => tab.key === value)?.key ?? "overview";
}

export function tabHref(basePath: string, tab: ApprocheTab): string {
  return tab === "overview" ? basePath : `${basePath}?tab=${tab}`;
}
