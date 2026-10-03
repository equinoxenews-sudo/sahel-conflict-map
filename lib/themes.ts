/**
 * Taxonomie éditoriale Équinoxe des synthèses : une thématique principale,
 * jusqu'à 3 thématiques secondaires, un type d'événement et une importance.
 * Distincte des catégories ACLED/GDELT (types/event.ts), qui restent
 * réservées aux marqueurs de la carte.
 */
export const THEMES = [
  { key: "conflicts", label: "Conflits & opérations militaires", short: "Conflits",
    hint: "combats, offensives, frappes aériennes, bombardements, artillerie, drones, cessez-le-feu, mouvements de troupes, occupation ou reprise de territoire" },
  { key: "terrorism", label: "Terrorisme & violences armées", short: "Terrorisme",
    hint: "attentats, groupes jihadistes ou armés non étatiques, EEI, attentats-suicides, enlèvements, prises d'otages, assassinats ciblés, massacres, attaques contre des civils" },
  { key: "civil_unrest", label: "Troubles & mouvements sociaux", short: "Troubles",
    hint: "manifestations, émeutes, grèves, affrontements avec les forces de sécurité, violences intercommunautaires" },
  { key: "politics", label: "Politique & gouvernance", short: "Politique",
    hint: "élections, coups d'État, changements de gouvernement, crises politiques, réformes institutionnelles, nominations, transitions" },
  { key: "diplomacy", label: "Diplomatie & relations internationales", short: "Diplomatie",
    hint: "rencontres bilatérales, sommets, négociations, accords, tensions diplomatiques, reconnaissance d'États, organisations internationales" },
  { key: "defense_security", label: "Défense & sécurité", short: "Défense",
    hint: "forces armées et de sécurité, coopération militaire, bases, exercices, achats et livraisons d'armes, industrie de défense, doctrine" },
  { key: "intelligence_influence", label: "Renseignement & influence", short: "Renseignement",
    hint: "espionnage, services de renseignement, ingérence étrangère, opérations d'influence, désinformation, propagande, guerre informationnelle" },
  { key: "cyber_technology", label: "Cyber & technologies", short: "Cyber",
    hint: "cyberattaques, cyberespionnage, ransomware, intelligence artificielle, technologies militaires, satellites, surveillance, guerre électronique" },
  { key: "economy", label: "Économie & sanctions", short: "Économie",
    hint: "sanctions économiques, commerce international, dette, inflation, investissements, entreprises stratégiques, embargo, crise financière" },
  { key: "energy_resources", label: "Énergie & ressources", short: "Énergie",
    hint: "pétrole, gaz, uranium, nucléaire, minerais critiques, mines, eau, sécurité énergétique" },
  { key: "infrastructure_logistics", label: "Infrastructures & logistique", short: "Infrastructures",
    hint: "ports, aéroports, chemins de fer, pipelines, câbles sous-marins, détroits, routes maritimes, infrastructures critiques" },
  { key: "climate_disasters", label: "Climat & catastrophes", short: "Climat",
    hint: "séismes, incendies, inondations, sécheresses, tempêtes, catastrophes naturelles" },
  { key: "humanitarian_health", label: "Humanitaire & santé", short: "Humanitaire",
    hint: "réfugiés, déplacés, famine, insécurité alimentaire, épidémies, aide humanitaire, ONG, accès aux soins" },
  { key: "crime_trafficking", label: "Criminalité & trafics", short: "Criminalité",
    hint: "trafic de drogue ou d'armes, traite humaine, contrebande, criminalité organisée, blanchiment, piraterie" },
  { key: "strategic_development", label: "Développements stratégiques", short: "Stratégie",
    hint: "UNIQUEMENT pour un basculement géopolitique, une reconfiguration d'alliance ou un changement structurel de long terme impossible à classer ailleurs ; jamais par défaut" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

export const EVENT_TYPES = [
  { key: "airstrike", label: "Frappe aérienne" },
  { key: "drone_strike", label: "Frappe de drone" },
  { key: "explosion", label: "Explosion" },
  { key: "armed_clash", label: "Affrontement armé" },
  { key: "artillery_fire", label: "Tirs d'artillerie" },
  { key: "missile_attack", label: "Attaque de missiles" },
  { key: "terrorist_attack", label: "Attentat" },
  { key: "ied_attack", label: "Attaque à l'EEI" },
  { key: "kidnapping", label: "Enlèvement" },
  { key: "assassination", label: "Assassinat" },
  { key: "protest", label: "Manifestation" },
  { key: "riot", label: "Émeute" },
  { key: "strike", label: "Grève" },
  { key: "coup", label: "Coup d'État" },
  { key: "election", label: "Élection" },
  { key: "diplomatic_meeting", label: "Rencontre diplomatique" },
  { key: "sanction", label: "Sanctions" },
  { key: "cyberattack", label: "Cyberattaque" },
  { key: "military_exercise", label: "Exercice militaire" },
  { key: "arms_delivery", label: "Livraison d'armes" },
  { key: "natural_disaster", label: "Catastrophe naturelle" },
  { key: "humanitarian_crisis", label: "Crise humanitaire" },
  { key: "criminal_operation", label: "Opération criminelle" },
  { key: "infrastructure_disruption", label: "Perturbation d'infrastructure" },
] as const;

export type EventTypeKey = (typeof EVENT_TYPES)[number]["key"];

export const IMPORTANCE_LEVELS = [
  { key: "high", label: "Élevée" },
  { key: "medium", label: "Moyenne" },
  { key: "low", label: "Faible" },
] as const;

export type ImportanceKey = (typeof IMPORTANCE_LEVELS)[number]["key"];

export const MAX_SECONDARY_THEMES = 3;

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === "string" && THEMES.some((t) => t.key === value);
}

export function isEventTypeKey(value: unknown): value is EventTypeKey {
  return typeof value === "string" && EVENT_TYPES.some((t) => t.key === value);
}

export function isImportanceKey(value: unknown): value is ImportanceKey {
  return typeof value === "string" && IMPORTANCE_LEVELS.some((t) => t.key === value);
}

export function themeLabel(key: string): string {
  return THEMES.find((t) => t.key === key)?.label ?? key;
}

export function themeShortLabel(key: string): string {
  return THEMES.find((t) => t.key === key)?.short ?? key;
}

export function importanceLabel(key: string): string {
  return (IMPORTANCE_LEVELS.find((t) => t.key === key)?.label ?? key).toLowerCase();
}

export function eventTypeLabel(key: string): string {
  return EVENT_TYPES.find((t) => t.key === key)?.label ?? key;
}

/** Anciennes catégories ACLED-like des synthèses déjà enregistrées.
 * "Strategic developments" est volontairement absente : c'était la valeur
 * par défaut de l'ancien classement, donc sans signification fiable. */
const LEGACY_THEME: Record<string, ThemeKey> = {
  "Battles": "conflicts",
  "Explosions/Remote violence": "conflicts",
  "Violence against civilians": "terrorism",
  "Protests": "civil_unrest",
  "Riots": "civil_unrest",
};

const LEGACY_EVENT_TYPE: Record<string, EventTypeKey> = {
  "Battles": "armed_clash",
  "Explosions/Remote violence": "explosion",
  "Protests": "protest",
  "Riots": "riot",
};

interface ThemedBrief {
  category?: string | null;
  primary_theme?: string | null;
  event_type?: string | null;
}

/** Thématique principale, avec repli sur l'ancienne catégorie pour les
 * synthèses créées avant la nouvelle taxonomie. */
export function resolveTheme(brief: ThemedBrief): ThemeKey | null {
  if (isThemeKey(brief.primary_theme)) return brief.primary_theme;
  return brief.category ? LEGACY_THEME[brief.category] ?? null : null;
}

export function resolveEventType(brief: ThemedBrief): EventTypeKey | null {
  if (isEventTypeKey(brief.event_type)) return brief.event_type;
  return brief.category ? LEGACY_EVENT_TYPE[brief.category] ?? null : null;
}

export function themePromptList(): string {
  return THEMES.map((t) => `${t.key} (${t.label} : ${t.hint})`).join(" ; ");
}

export function eventTypePromptList(): string {
  return EVENT_TYPES.map((t) => t.key).join(", ");
}
