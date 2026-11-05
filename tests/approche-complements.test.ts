import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { classifyObservations, complementPanels, THEMES, THEME_NONE, type Placement } from "../lib/approche/complements";
import { electricityKeyParts, electricityVintages, productionSegments } from "../lib/approche/electricity";
import { formatUnit, formatValue } from "../lib/approche/formatters";
import { loadApprocheCountry } from "../lib/approche/repository";
import { CountryDataSchema, ObservationSchema, type CountryData, type Observation } from "../lib/approche/schema";
import { comparableGap, metricViews } from "../lib/approche/view";
import { unreadObservationKeys } from "../scripts/lib/approcheUnread";

// Les trois fiches pilotes (France, Mali, Chine) : chaque observation vérifiée a un emplacement, ou une raison explicite de ne pas
// en avoir. Le contrôle passe par le même classement que l'interface.

const COUNTRIES = ["FRA", "MLI", "CHN"] as const;
// Mali et Chine sont en brouillon : pour les contrôler, la fiche est lue comme si elle était publiée (la visibilité a ses propres tests).
const load = (iso3: string): CountryData => {
  const data = loadApprocheCountry(iso3);
  assert.ok(data, `${iso3} : fiche invalide ou publication refusée`);
  return { ...data, publication: "published" };
};

function observation(overrides: Partial<Observation> = {}): Observation {
  return ObservationSchema.parse({
    id: "o-1",
    countryCode: "FRA",
    key: "economy.sample_target_2030",
    label: "Cible d'essai",
    value: 4,
    unit: "%",
    referencePeriod: "2030",
    geographicScope: "France",
    methodology: "Essai.",
    sourceIds: ["S1"],
    collectedAt: "2026-11-01",
    verifiedAt: "2026-11-01",
    status: "verified",
    dataKind: "official_statement",
    ...overrides,
  });
}

function country(observations: Observation[], publication: CountryData["publication"] = "published"): CountryData {
  return CountryDataSchema.parse({
    schemaVersion: 1,
    countryCode: "FRA",
    slug: "france",
    zoneSlug: "europe",
    name: "France",
    publication,
    lastCheckedAt: "2026-11-01",
    sources: [{ id: "S1", publisher: "Organisme", title: "Source d'essai", canonicalUrl: "https://example.org/s1", accessedAt: "2026-11-01", license: "Licence ouverte", reuse: "allowed" }],
    observations,
  });
}

const placementOf = (data: CountryData, key: string): Placement => {
  const found = data.observations.find((item) => item.key === key);
  assert.ok(found, key);
  return classifyObservations(data).get(found.id) as Placement;
};

test("les 95 observations des fiches pilotes ont toutes un emplacement ou une raison de ne pas en avoir", () => {
  let total = 0;
  for (const iso3 of COUNTRIES) {
    const data = load(iso3);
    const placements = classifyObservations(data);
    for (const item of data.observations) {
      total += 1;
      const placement = placements.get(item.id);
      assert.ok(placement, `${iso3} ${item.key} : non classée`);
      if (placement.kind === "hidden") {
        // Les seules observations vérifiées non affichées sont celles que la fiche masque volontairement (theme « none »).
        assert.ok(item.status !== "verified" || placement.reason.startsWith("masquée volontairement"), `${iso3} ${item.key} : vérifiée mais ${placement.reason}`);
        assert.equal(item.theme, THEME_NONE, `${iso3} ${item.key}`);
      }
    }
    assert.deepEqual(unreadObservationKeys(data), [], `${iso3} : observations sans emplacement`);
  }
  assert.ok(total >= 95, "les 95 observations des trois fiches éditoriales (et les séries automatiques) sont couvertes");
});

test("chaque ligne d'un panneau est vérifiée, datée, sourcée et nommée ; une valeur en attente n'est jamais présentée comme un fait", () => {
  for (const iso3 of COUNTRIES) {
    const data = load(iso3);
    for (const panel of complementPanels(data)) {
      assert.ok(THEMES.some((theme) => theme.id === panel.id && theme.tab === panel.tab), `${iso3} ${panel.id}`);
      assert.ok(panel.rows.length > 0);
      for (const row of panel.rows) {
        assert.ok(row.label.trim().length > 0, `${iso3} ${panel.id} : ligne sans libellé`);
        if (row.metric) {
          assert.ok(row.metric.period.length > 0 && row.metric.sources.length > 0, `${iso3} ${row.label} : période ou source manquante`);
          assert.notEqual(row.metric.value, "Donnée non disponible");
        }
      }
    }
  }
});

test("rien n'est affiché deux fois : une observation d'une tuile ou d'un module n'entre jamais dans un panneau", () => {
  for (const iso3 of COUNTRIES) {
    const data = load(iso3);
    const placements = classifyObservations(data);
    const inPanels = new Set(complementPanels(data).flatMap((panel) => panel.rows.map((row) => row.id)));
    for (const item of data.observations) {
      const placement = placements.get(item.id);
      if (placement && placement.kind !== "panel") assert.ok(!inPanels.has(item.id), `${iso3} ${item.key} est dans un panneau et ailleurs (${placement.kind})`);
    }
  }
});

test("répartition par rubrique des observations jusque-là invisibles (Mali, Chine, France)", () => {
  const where = (iso3: string, key: string) => {
    const placement = placementOf(load(iso3), key);
    return placement.kind === "panel" ? `${placement.tab}/${placement.theme}` : placement.kind === "drawer" ? `drawer/${placement.topic}` : placement.kind;
  };
  assert.equal(where("MLI", "institutions.uemoa"), "relations/appartenances");
  assert.equal(where("MLI", "economy.growth_projection_2026_wb"), "economy/projections");
  assert.equal(where("MLI", "economy.growth_projection_2025_wb"), "drawer/growth");
  assert.equal(where("MLI", "humanitarian.idps_sep_2025"), "issues/humanitaire");
  assert.equal(where("MLI", "security.minusma_closed"), "hidden", "la fin de la MINUSMA est portée par la chronologie de la vue d'ensemble");
  assert.equal(where("MLI", "security.protection_priorities_2026"), "hidden", "un décompte sans le détail des cinq risques n'est pas affiché");
  assert.equal(where("CHN", "demography.population_2025_nbs"), "drawer/population");
  assert.equal(where("CHN", "demography.urban_share_2025_nbs"), "overview/demographie");
  assert.equal(where("CHN", "economy.gdp_growth_2025_nbs"), "drawer/growth");
  assert.equal(where("CHN", "economy.urban_unemployment_2025_nbs"), "economy/conjoncture");
  assert.equal(where("CHN", "energy.nonfossil_share_target_2030"), "economy/energie");
  assert.equal(where("CHN", "defense.budget_2026_central_cny"), "defense/defense");
  assert.equal(where("FRA", "demography.population.eurostat"), "drawer/population");
  assert.equal(where("FRA", "economy.gdp_nominal_eur_insee_2025"), "drawer/gdp");
  assert.equal(where("FRA", "security.anssi_events_2025"), "issues/cyber");
  assert.equal(where("FRA", "economy.haropa_maritime_traffic_2025"), "economy/ports");
  assert.equal(where("FRA", "economy.businessfrance_energy_projects_2025"), "economy/investissement");
  assert.equal(where("FRA", "energy.electricity.production_total_2025"), "electricity");
});

test("la fourchette d'objectif de la Chine forme une seule ligne « bas – haut »", () => {
  const data = load("CHN");
  const rows = complementPanels(data).find((panel) => panel.id === "projections")?.rows ?? [];
  const target = rows.filter((row) => row.label.startsWith("Objectif de croissance du PIB 2026"));
  assert.equal(target.length, 1, "bas et haut de fourchette fusionnés");
  assert.match(target[0].metric?.value ?? "", /^\+?4,5 – 5$/);
  assert.equal(target[0].metric?.sources.length, 1, "même source : pas de doublon");
});

test("« Autres sources » : organisme, période, périmètre, nature, méthode et lien ; l'écart n'est chiffré que si les mesures sont comparables", () => {
  const mali = metricViews(load("MLI"));
  const growth = mali.get("economy.gdp_growth");
  assert.ok(growth, "tuile de croissance du Mali");
  const estimate = growth.others.find((other) => other.label.includes("estimation"));
  assert.ok(estimate, "l'estimation 2025 (4,1 %) est présentée à côté de la série 2025 (5,6 %), jamais fondue avec elle");
  assert.equal(estimate.publisher, "Banque mondiale");
  assert.ok(estimate.methodology.length > 0 && estimate.sourceUrl.startsWith("https://"));
  assert.equal(estimate.kind, "Donnée observée");

  const china = metricViews(load("CHN")).get("demography.population");
  assert.ok(china?.others.some((other) => other.publisher.includes("statistiques")), "population du Bureau national des statistiques");
  const france = metricViews(load("FRA")).get("demography.population");
  assert.ok(france?.others.some((other) => other.period === "2026"), "population Eurostat 2026 distincte de la Banque mondiale 2025");

  // Deux mesures d'une même source (production et consommation d'un même bilan) ne sont pas « d'autres sources » l'une de l'autre.
  const electricity = metricViews(load("FRA")).get("energy.electricity.net_exports");
  assert.deepEqual(electricity?.others, []);
  const sameSource = [...metricViews(load("FRA")).values()].filter((metric) => metric.others.some((other) => other.gapPercent !== null));
  assert.deepEqual(sameSource.map((metric) => metric.key), [], "aucun écart chiffré entre mesures de périmètres ou de périodes différents sur les fiches pilotes");

  const a = observation({ value: 100, unit: "habitants", referencePeriod: "2025", geographicScope: "Chine" });
  assert.equal(comparableGap(a, observation({ value: 99, unit: "habitants", referencePeriod: "2025", geographicScope: "chine" })), "-1", "même période, périmètre et unité : écart calculé");
  assert.equal(comparableGap(a, observation({ value: 99, unit: "habitants", referencePeriod: "2026", geographicScope: "Chine" })), null, "périodes différentes");
  assert.equal(comparableGap(a, observation({ value: 99, unit: "habitants", referencePeriod: "2025", geographicScope: "Chine continentale" })), null, "périmètres différents");
  assert.equal(comparableGap(a, observation({ value: 99, unit: "USD", referencePeriod: "2025", geographicScope: "Chine" })), null, "unités différentes");
  assert.equal(comparableGap(a, observation({ value: true as unknown as number, unit: "habitants" })), null);
});

test("électricité : un millésime par année, jamais complété par une autre année", () => {
  const vintages = electricityVintages(metricViews(load("FRA")));
  assert.deepEqual(vintages.map((vintage) => vintage.year), ["2025", "2024"], "le plus récent d'abord");
  const [latest, previous] = vintages;
  assert.ok(latest.metrics.production_total && latest.metrics.consumption && latest.metrics.low_carbon_share, "consommation 2025 reconnue (alias consumption_corrected)");
  for (const vintage of vintages) for (const metric of Object.values(vintage.metrics)) assert.ok(metric.period.startsWith(vintage.year), `${metric.key} : période ${metric.period} dans le millésime ${vintage.year}`);
  assert.equal(latest.metrics.renewable, undefined, "renouvelable absent en 2025 : pas repris de 2024");
  assert.ok(previous.metrics.renewable && previous.metrics.fossil);
  const production = productionSegments(latest);
  assert.ok(production && production.segments.some((segment) => segment.id === "nuclear" && segment.value === 373));
  assert.ok(!production.segments.some((segment) => segment.id === "fossil"), "aucune filière fossile inventée pour 2025");
  assert.deepEqual(electricityKeyParts("energy.electricity.consumption_corrected_2025", "2025"), { base: "consumption", year: "2025" });
  assert.deepEqual(electricityKeyParts("energy.electricity.nuclear", "2024"), { base: "nuclear", year: "2024" });
  assert.equal(electricityKeyParts("energy.electricity.inconnue", "2024"), null);
  assert.equal(electricityKeyParts("economy.gdp_growth", "2024"), null);
});

test("une valeur en attente apparaît « à vérifier », sans valeur ; refusée ou périmée, elle n'est pas servie", () => {
  const data = country([
    observation({ id: "p", key: "humanitarian.sample_pending", label: "Valeur en attente", value: null, status: "pending" }),
    observation({ id: "s", key: "humanitarian.sample_stale", label: "Valeur périmée", status: "stale" }),
    observation({ id: "v", key: "humanitarian.sample_ok", label: "Valeur vérifiée", value: 12, unit: "personnes" }),
  ]);
  const rows = complementPanels(data).flatMap((panel) => panel.rows);
  assert.deepEqual(rows.map((row) => [row.label, row.metric === null]), [["Valeur en attente", true], ["Valeur vérifiée", false]]);
});

test("règles génériques : sans libellé, sans rubrique ou de rubrique « none », l'observation n'est pas affichée et le validateur la signale", () => {
  const data = country([
    observation({ id: "a", key: "humanitarian.no_label", label: null }),
    observation({ id: "b", key: "mystery.unknown_family", label: "Famille inconnue" }),
    observation({ id: "c", key: "humanitarian.masked", label: "Masquée", theme: THEME_NONE }),
    observation({ id: "d", key: "mystery.explicit_theme", label: "Rubrique explicite", theme: "cyber" }),
  ]);
  assert.deepEqual(unreadObservationKeys(data).map((item) => item.key).sort(), ["humanitarian.no_label", "mystery.unknown_family"]);
  assert.deepEqual(complementPanels(data).map((panel) => `${panel.tab}/${panel.id}`), ["issues/cyber"], "la rubrique explicite l'emporte sur le préfixe de la clé");
});

test("les panneaux n'existent pas pour une fiche non visible, et une fiche sans donnée complémentaire n'en affiche aucun", () => {
  assert.deepEqual(complementPanels(country([observation({ key: "humanitarian.x", label: "X" })], "draft")), [], "brouillon hors préversion");
  assert.deepEqual(complementPanels(country([])), []);
});

test("mise en forme des effectifs et des montants en devise locale", () => {
  const people = (value: number) => observation({ key: "humanitarian.n", value, unit: "personnes" });
  assert.equal(formatValue(people(5_100_000)), "5,1 millions");
  assert.equal(formatUnit(people(5_100_000)), "de personnes");
  assert.equal(formatValue(people(1_600_000)), "1,6 million");
  assert.equal(formatValue(people(195_020)).replace(/\s/g, " "), "195 020");
  assert.equal(formatUnit(people(195_020)), "personnes");
  const budget = observation({ key: "defense.budget", value: 1.91e12, unit: "CNY" });
  assert.equal(formatValue(budget).replace(/\s/g, " "), "1 910 Md");
  assert.equal(formatUnit(budget), "CNY");
});

test("aucune donnée de pays n'est écrite dans le moteur ni dans les composants des données complémentaires", () => {
  const files = ["lib/approche/complements.ts", "lib/approche/electricity.ts", "components/approche/ComplementPanels.tsx", "components/approche/ElectricitySection.tsx"];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    assert.ok(!/\b(France|Mali|Chine|China|Eurostat|INSEE|Insee|HAROPA|ANSSI|Banque mondiale|CEDEAO|UEMOA|MINUSMA)\b/.test(text), `${file} : nom de pays ou d'organisme dans du code commun`);
  }
});

test("rubrique « Développement humain » (vue d'ensemble) : affichée seulement quand un pays a des observations development.*, avec libellé, millésime, statut et sources conservés", () => {
  const theme = THEMES.find((item) => item.id === "developpement");
  assert.ok(theme && theme.tab === "overview" && theme.title === "Développement humain");
  // Rubrique générique : une clé development.* y est rangée sans theme explicite, pour tout pays.
  const generic = observation({ key: "development.school_enrolment_2024_wb", label: "Scolarisation (Banque mondiale, 2024)", unit: "%", referencePeriod: "2024" });
  const fra = load("FRA");
  const base = { ...fra, observations: [...fra.observations, generic] };
  assert.equal(classifyObservations(base).get(generic.id)?.kind, "panel");
  const panel = complementPanels(base).find((item) => item.id === "developpement");
  assert.ok(panel && panel.tab === "overview");
  assert.deepEqual(panel.rows.map((row) => row.label), ["Scolarisation (Banque mondiale, 2024)"]);
  // Absente quand le pays n'a aucune observation de ce type.
  for (const iso3 of COUNTRIES) assert.ok(!complementPanels(load(iso3)).some((item) => item.id === "developpement"), `${iso3} : pas de rubrique vide`);
});

test("RCA : l'indice de capital humain 2020 apparaît dans « Développement humain », avec son libellé daté, sa valeur, sa période et sa source", () => {
  const data = loadApprocheCountry("CAF");
  assert.ok(data);
  const caf = { ...data, publication: "published" as const };
  const panel = complementPanels(caf).find((item) => item.id === "developpement");
  assert.ok(panel, "rubrique présente pour la RCA");
  assert.equal(panel.tab, "overview");
  assert.equal(panel.rows.length, 1);
  const [row] = panel.rows;
  assert.equal(row.label, "Indice de capital humain (Banque mondiale, 2020)");
  assert.ok(row.metric, "valeur affichée (observation vérifiée)");
  assert.equal(row.metric.period, "2020");
  assert.ok(row.metric.sources.some((source) => source.publisher === "Banque mondiale"));
});
