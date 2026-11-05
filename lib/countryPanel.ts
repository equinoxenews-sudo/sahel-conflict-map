import { getApprocheData } from "./approche/repository";
import { metricViews, relationViews } from "./approche/view";
import { getCountryProfile, getCountrySlugByIso3 } from "./countries";
import { acronymOf, orgByName, ORG_BY_KEY } from "./orgLogos";
import { powerIndexOf, type PowerIndexResult } from "./powerIndex";
import { formatArea, formatPopulation, formatUsd, WORLD_INDICATORS, WORLD_INDICATORS_SOURCE } from "./worldIndicators";

// Données du panneau pays du globe, assemblées côté serveur (les fiches Approche ne partent jamais en entier vers le navigateur) :
// identité, chiffres clés, indice de puissance, relations et appartenances. Une fiche Approche publiée fournit tout ; un pays qui n'en a
// pas encore garde l'identité de son ancienne fiche et un encart « fiche en préparation ».

export interface PanelFact {
  label: string;
  value: string;
}

export interface PanelFigure extends PanelFact {
  /** Année de la valeur (série annuelle de la Banque mondiale). */
  year: number;
}

export interface PanelRelation {
  id: string;
  name: string;
  /** Pays cible (drapeau) ; null quand la cible est une organisation (CEDEAO, Nations unies…). */
  iso2: string | null;
  /** Organisation cible, pour son logo ou son sigle ; null pour un pays. */
  org: { logo: string | null; acronym: string } | null;
  type: "treaty" | "cooperation" | "tension";
  /** Intitulés des relations vérifiées avec cette cible (affichés au survol). */
  titles: string[];
}

export interface PanelMembership {
  id: string;
  name: string;
  acronym: string;
  logo: string | null;
  /** Précision de statut (« ancien membre », « suspendu »…), ou null. */
  note: string | null;
}

export interface CountryPanelData {
  iso3: string;
  /** Nom français quand une fiche le fournit ; sinon le navigateur garde le nom du fond de carte. */
  name: string | null;
  /** Fiche Approche publiée : relations et appartenances sont des données vérifiées et sourcées. */
  approche: boolean;
  identity: PanelFact[];
  figures: PanelFigure[];
  power: PowerIndexResult | null;
  relations: PanelRelation[];
  memberships: PanelMembership[];
  source: string;
}

const IDENTITY_KEYS: [key: string, label: string][] = [
  ["identity.capital", "Capitale"],
  ["politics.regime", "Régime"],
  ["politics.head_of_state", "Chef de l'État"],
  ["politics.head_of_government", "Chef du gouvernement"],
  ["identity.language", "Langue"],
  ["identity.currency", "Monnaie"],
];

const MAX_RELATIONS = 14;
const MAX_MEMBERSHIPS = 12;

function figuresOf(iso3: string): PanelFigure[] {
  const indicators = WORLD_INDICATORS[iso3];
  if (!indicators) return [];
  const out: PanelFigure[] = [];
  if (indicators.population) out.push({ label: "Population", value: formatPopulation(indicators.population.value), year: indicators.population.year });
  if (indicators.gdp) out.push({ label: "PIB (nominal)", value: formatUsd(indicators.gdp.value), year: indicators.gdp.year });
  if (indicators.military) out.push({ label: "Dépenses militaires", value: formatUsd(indicators.military.value), year: indicators.military.year });
  if (indicators.area) out.push({ label: "Superficie", value: formatArea(indicators.area.value), year: indicators.area.year });
  return out;
}

/** Relations vérifiées regroupées par cible (un pays ou une organisation) : une seule pastille par cible, la tension l'emportant sur le reste. */
function relationsOf(data: NonNullable<ReturnType<typeof getApprocheData>>): PanelRelation[] {
  const byTarget = new Map<string, PanelRelation>();
  for (const relation of relationViews(data)) {
    const existing = byTarget.get(relation.targetName);
    if (existing) {
      existing.titles.push(relation.title);
      if (relation.type === "tension") existing.type = "tension";
      continue;
    }
    const org = relation.targetIso2 ? null : orgByName(relation.targetName);
    byTarget.set(relation.targetName, {
      id: relation.id,
      name: org?.name ?? relation.targetName,
      iso2: relation.targetIso2,
      org: relation.targetIso2 ? null : { logo: org?.logo ?? null, acronym: org?.acronym ?? acronymOf(relation.targetName) },
      type: relation.type,
      titles: [relation.title],
    });
  }
  return [...byTarget.values()].slice(0, MAX_RELATIONS);
}

/** Appartenances connues : une ligne par organisation (nom, sigle, logo), jamais un libellé deviné pour une clé inconnue. */
function membershipsOf(metrics: ReturnType<typeof metricViews>): PanelMembership[] {
  const byGroup = new Map<string, PanelMembership>();
  for (const metric of metrics.values()) {
    const definition = ORG_BY_KEY[metric.key];
    if (!definition || !metric.value || metric.value === "Non" || metric.value === "Donnée non disponible" || byGroup.has(definition.group)) continue;
    byGroup.set(definition.group, { id: definition.group, name: definition.name, acronym: definition.acronym, logo: definition.logo, note: definition.note ?? null });
  }
  return [...byGroup.values()].slice(0, MAX_MEMBERSHIPS);
}

export function buildCountryPanel(rawIso3: string): CountryPanelData {
  const iso3 = rawIso3.toUpperCase();
  const base = { iso3, figures: figuresOf(iso3), power: powerIndexOf(iso3), source: WORLD_INDICATORS_SOURCE };

  const data = getApprocheData(iso3);
  if (data) {
    const metrics = metricViews(data);
    const identity = IDENTITY_KEYS.flatMap(([key, label]) => {
      const metric = metrics.get(key);
      return metric ? [{ label, value: metric.value }] : [];
    });
    return { ...base, name: data.name, approche: true, identity, relations: relationsOf(data), memberships: membershipsOf(metrics) };
  }

  // Ancienne fiche : seuls la capitale, la forme de gouvernement, la monnaie et les langues sont des faits établis (le reste est de la démonstration).
  const slug = getCountrySlugByIso3(iso3);
  const profile = slug ? getCountryProfile(slug) : undefined;
  const identity: PanelFact[] = [];
  if (profile?.capital) identity.push({ label: "Capitale", value: profile.capital });
  if (profile?.government) identity.push({ label: "Régime", value: profile.government });
  if (profile?.languages?.length) identity.push({ label: "Langue", value: profile.languages.join(", ") });
  if (profile?.currency) identity.push({ label: "Monnaie", value: profile.currency });
  return { ...base, name: profile?.name ?? null, approche: false, identity, relations: [], memberships: [] };
}
