import { electricityKeyParts } from "./electricity";
import { READ_KEYS } from "./readKeys";
import { isOtherSourceOf } from "./measures";
import { isBlockedSource, isVisible } from "./sourceRegistry";
import type { CountryData, Observation } from "./schema";
import type { ApprocheTab } from "./tabs";
import { metricViews, type MetricView } from "./view";

// Données complémentaires : les observations que ni une tuile, ni un graphique, ni un module n'affichent sont rangées par rubrique dans
// leur onglet naturel, en panneaux dépliables. Aucun code propre à un pays : la rubrique vient du champ `theme` de l'observation, à défaut
// du préfixe de sa clé. Une observation n'apparaît qu'une seule fois dans la fiche (jamais en double d'une tuile).

export interface ThemeDefinition {
  id: string;
  tab: ApprocheTab;
  title: string;
  /** Clés rangées ici quand l'observation n'a pas de `theme` ; sans motif, la rubrique n'existe que par `theme` explicite. */
  match?: RegExp;
}

/** Rubriques, dans l'ordre d'affichage de chaque onglet. */
export const THEMES: readonly ThemeDefinition[] = [
  { id: "appartenances", tab: "relations", title: "Appartenances", match: /^institutions\./ },
  { id: "demographie", tab: "overview", title: "Démographie", match: /^demography\./ },
  { id: "politique", tab: "overview", title: "Vie politique", match: /^politics\./ },
  { id: "geographie", tab: "overview", title: "Géographie", match: /^geography\./ },
  { id: "projections", tab: "economy", title: "Projections et objectifs", match: /^economy\..*(projection|target)/ },
  { id: "conjoncture", tab: "economy", title: "Conjoncture", match: /^(economy|labour)\./ },
  { id: "energie", tab: "economy", title: "Énergie et transition", match: /^energy\./ },
  { id: "infrastructures", tab: "economy", title: "Infrastructures", match: /^infrastructure\./ },
  { id: "ressources", tab: "economy", title: "Ressources naturelles", match: /^resources\./ },
  { id: "recherche", tab: "economy", title: "Recherche et innovation", match: /^research\./ },
  { id: "ports", tab: "economy", title: "Ports et logistique" },
  { id: "investissement", tab: "economy", title: "Investissement étranger" },
  { id: "defense", tab: "defense", title: "Budget et données militaires", match: /^defense\./ },
  { id: "humanitaire", tab: "issues", title: "Situation humanitaire", match: /^humanitarian\./ },
  { id: "cyber", tab: "issues", title: "Cybersécurité" },
  { id: "securite", tab: "issues", title: "Sécurité", match: /^security\./ },
];

/** `theme: "none"` : valeur volontairement non affichée (décompte sans détail, fait déjà porté par la chronologie…). */
export const THEME_NONE = "none";

export type Placement =
  /** Lue par une tuile, une liste ou l'en-tête de l'interface. */
  | { kind: "tile" }
  /** Référencée par un module (`observationKey`). */
  | { kind: "module"; path: string }
  /** Section d'électricité, avec son sélecteur de millésime. */
  | { kind: "electricity"; year: string }
  /** Dans le volet « Autres sources » de la tuile qui porte le même sujet (`topic`). */
  | { kind: "drawer"; topic: string }
  /** Dans un panneau dépliable de son onglet. */
  | { kind: "panel"; theme: string; tab: ApprocheTab; pending: boolean }
  /** Non affichée, avec la raison. */
  | { kind: "hidden"; reason: string };

const escape = (text: string) => text.replace(/[.*+?^$()|[\]\\]/g, "\\$&");

/** Une clé lue peut contenir `${…}` (famille de clés) ; `geography.area` désigne toute clé `geography.area.<source>`. */
function readMatcher(key: string): RegExp {
  const body = key.split(/\$\{[^}]*\}/).map(escape).join("[A-Za-z0-9_-]+");
  return new RegExp(key === "geography.area" ? `^${body}(\\..+)?$` : `^${body}$`);
}

const READ_MATCHERS = READ_KEYS.filter((key) => !key.startsWith("energy.electricity.")).map(readMatcher);

function referencedKeys(value: unknown, path: string, into: Map<string, string>): void {
  if (Array.isArray(value)) value.forEach((child, index) => referencedKeys(child, `${path}[${index}]`, into));
  else if (value && typeof value === "object") {
    for (const [name, child] of Object.entries(value as Record<string, unknown>)) {
      if (name === "observationKey" && typeof child === "string") {
        if (!into.has(child)) into.set(child, path);
      } else referencedKeys(child, `${path}.${name}`, into);
    }
  }
}

function themeOf(observation: Observation): ThemeDefinition | "none" | null {
  if (observation.theme === THEME_NONE) return "none";
  const explicit = observation.theme ? THEMES.find((theme) => theme.id === observation.theme) : undefined;
  if (explicit) return explicit;
  return THEMES.find((theme) => theme.match?.test(observation.key)) ?? null;
}

/** Fourchette : deux observations `<racine>_low` et `<racine>_high` de même période, unité et rubrique ne forment qu'une ligne. */
function rangeKey(key: string): { stem: string; bound: "low" | "high" } | null {
  const match = key.match(/^(.+)_(low|high)$/);
  return match ? { stem: match[1], bound: match[2] as "low" | "high" } : null;
}

/**
 * Où s'affiche chaque observation d'une fiche. Sert à la fois à construire les panneaux et au contrôle de couverture : une
 * observation vérifiée sans emplacement est signalée au validateur, jamais perdue en silence.
 */
export function classifyObservations(data: CountryData): Map<string, Placement> {
  const placements = new Map<string, Placement>();
  // « Publiable » indépendamment du statut de la fiche (un brouillon se contrôle aussi) : vérifiée, avec valeur, sans source exclue.
  const blocked = new Set(data.sources.filter(isBlockedSource).map((source) => source.id));
  const published = new Set(
    data.observations.filter((observation) => observation.status === "verified" && observation.value !== null && !observation.sourceIds.some((id) => blocked.has(id))).map((observation) => observation.id),
  );
  const referenced = new Map<string, string>();
  referencedKeys(data.modules, "modules", referenced);
  const isRead = (key: string) => READ_MATCHERS.some((matcher) => matcher.test(key));
  const anchored = (observation: Observation) => !electricityKeyParts(observation.key, observation.referencePeriod) && (isRead(observation.key) || referenced.has(observation.key));

  // Sujets déjà portés par une tuile ou un module : une autre mesure du même sujet va dans son volet « Autres sources ».
  const anchors = data.observations.filter((observation) => observation.topic && published.has(observation.id) && anchored(observation));

  for (const observation of data.observations) {
    const { key } = observation;
    const electricity = electricityKeyParts(key, observation.referencePeriod);
    if (electricity && published.has(observation.id)) {
      placements.set(observation.id, { kind: "electricity", year: electricity.year });
      continue;
    }
    if (isRead(key) && !electricity) {
      placements.set(observation.id, { kind: "tile" });
      continue;
    }
    if (referenced.has(key)) {
      placements.set(observation.id, { kind: "module", path: referenced.get(key) as string });
      continue;
    }
    const theme = themeOf(observation);
    if (theme === "none") {
      placements.set(observation.id, { kind: "hidden", reason: "masquée volontairement (theme « none »)" });
      continue;
    }
    if (!published.has(observation.id)) {
      // Une valeur en attente de vérification reste visible comme « à vérifier » ; refusée, périmée ou contestée, elle n'est pas servie.
      if (observation.status === "pending" && theme && observation.label) placements.set(observation.id, { kind: "panel", theme: theme.id, tab: theme.tab, pending: true });
      else placements.set(observation.id, { kind: "hidden", reason: `statut « ${observation.status} »${observation.value === null ? ", sans valeur" : ""}` });
      continue;
    }
    if (observation.topic && anchors.some((anchor) => isOtherSourceOf(anchor, observation))) {
      placements.set(observation.id, { kind: "drawer", topic: observation.topic });
      continue;
    }
    if (!observation.label) {
      placements.set(observation.id, { kind: "hidden", reason: "sans libellé" });
      continue;
    }
    if (!theme) {
      placements.set(observation.id, { kind: "hidden", reason: "aucune rubrique (ni theme, ni préfixe de clé connu)" });
      continue;
    }
    placements.set(observation.id, { kind: "panel", theme: theme.id, tab: theme.tab, pending: false });
  }
  return placements;
}

export interface ComplementRow {
  id: string;
  label: string;
  /** Valeur vérifiée, ou null pour une valeur « à vérifier » (jamais présentée comme un fait). */
  metric: MetricView | null;
  /** Texte de la valeur quand elle est une fourchette. */
  display?: string;
}

export interface ComplementPanel {
  id: string;
  tab: ApprocheTab;
  title: string;
  rows: ComplementRow[];
}

/** Panneaux de données complémentaires de la fiche, par onglet, dans l'ordre des rubriques. */
export function complementPanels(data: CountryData, metrics: Map<string, MetricView> = metricViews(data)): ComplementPanel[] {
  if (!isVisible(data)) return [];
  const placements = classifyObservations(data);
  const byTheme = new Map<string, ComplementRow[]>();
  const merged = new Set<string>();

  for (const observation of data.observations) {
    const placement = placements.get(observation.id);
    if (!placement || placement.kind !== "panel" || merged.has(observation.id)) continue;
    const rows = byTheme.get(placement.theme) ?? [];
    byTheme.set(placement.theme, rows);
    if (placement.pending) {
      rows.push({ id: observation.id, label: observation.label ?? observation.key, metric: null });
      continue;
    }
    const metric = metrics.get(observation.key);
    if (!metric) continue;
    const range = rangeKey(observation.key);
    if (range) {
      const partner = data.observations.find((other) => other.id !== observation.id && rangeKey(other.key)?.stem === range.stem && rangeKey(other.key)?.bound !== range.bound);
      const partnerMetric = partner ? metrics.get(partner.key) : undefined;
      const same = partner && partnerMetric && partner.referencePeriod === observation.referencePeriod && partner.unit === observation.unit && placements.get(partner.id)?.kind === "panel";
      if (partner && partnerMetric && same) {
        const [low, high] = range.bound === "low" ? [metric, partnerMetric] : [partnerMetric, metric];
        merged.add(partner.id);
        rows.push({
          id: observation.id,
          label: observation.label ?? observation.key,
          display: `${low.value} – ${high.value.replace(/^\+/, "")}`,
          metric: {
            ...low,
            raw: null,
            value: `${low.value} – ${high.value.replace(/^\+/, "")}`,
            methodology: low.methodology === high.methodology ? low.methodology : `${low.methodology} / ${high.methodology}`,
            sources: [...new Map([...low.sources, ...high.sources].map((source) => [source.id, source])).values()],
            others: [],
          },
        });
        continue;
      }
    }
    rows.push({ id: observation.id, label: observation.label ?? observation.key, metric });
  }

  return THEMES.flatMap((theme) => {
    const rows = byTheme.get(theme.id) ?? [];
    return rows.length > 0 ? [{ id: theme.id, tab: theme.tab, title: theme.title, rows }] : [];
  });
}
