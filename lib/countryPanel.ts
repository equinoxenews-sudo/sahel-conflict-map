import { getApprocheData } from "./approche/repository";
import { metricViews, relationViews } from "./approche/view";
import { getCountryProfile, getCountrySlugByIso3 } from "./countries";
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
  iso2: string | null;
  type: "treaty" | "cooperation" | "tension";
  title: string;
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
  memberships: string[];
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

const MAX_RELATIONS = 6;
const MAX_MEMBERSHIPS = 8;

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
    const memberships = [...metrics.values()]
      .filter((metric) => metric.key.startsWith("institutions."))
      .flatMap((metric) => {
        // Une valeur « Oui » ne dit rien sans son libellé ; une valeur « Non » n'est pas une appartenance ; un texte libre se suffit.
        if (!metric.value || metric.value === "Donnée non disponible" || metric.value === "Non") return [];
        if (!metric.label) return [metric.value];
        return [metric.value === "Oui" ? metric.label : `${metric.label} : ${metric.value}`];
      })
      .slice(0, MAX_MEMBERSHIPS);
    const relations = relationViews(data)
      .slice(0, MAX_RELATIONS)
      .map((relation) => ({ id: relation.id, name: relation.targetName, iso2: relation.targetIso2, type: relation.type, title: relation.title }));
    return { ...base, name: data.name, approche: true, identity, relations, memberships };
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
