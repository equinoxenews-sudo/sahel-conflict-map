import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { containsDemo, demoEnabled, getDemoModules, mergeModules, parseDemoFile } from "../lib/approche/demo";
import { MapLayerSchema } from "../lib/approche/modules";
import { ICON_PATHS, iconForKind } from "../lib/approche/icons";
import { iconForMetric, iconForTopic } from "../lib/approche/metricIcons";
import { displayable } from "../lib/approche/media";
import { formatDate, formatValue, formatWithUnit } from "../lib/approche/formatters";
import { getApprocheData, listApprocheCountries } from "../lib/approche/repository";
import { tabHref, validateTab } from "../lib/approche/tabs";
import { CountryDataSchema, ObservationSchema, type CountryData, type Observation } from "../lib/approche/schema";
import { BLOCKED_WORLD_BANK_INDICATORS, isBlockedSource, moduleProblems, publishedObservations, publishProblems, SIPRI_ENTRY } from "../lib/approche/sourceRegistry";
import { claimViews, metricViews, pendingObservations, relationViews } from "../lib/approche/view";

const france = () => {
  const data = getApprocheData("FRA");
  assert.ok(data, "la fiche France doit être publiable");
  return data;
};

function observation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "x-1",
    countryCode: "FRA",
    key: "economy.gdp_growth",
    value: 1,
    unit: "%",
    referencePeriod: "2025",
    geographicScope: "France",
    methodology: "test",
    sourceIds: ["S1"],
    collectedAt: "2026-10-29",
    verifiedAt: "2026-10-29",
    status: "verified",
    dataKind: "observed",
    history: [],
    ...overrides,
  };
}

function data(overrides: Partial<CountryData> = {}): CountryData {
  return {
    schemaVersion: 1,
    countryCode: "FRA",
    slug: "france",
    zoneSlug: "europe",
    name: "France",
    publication: "published",
    lastCheckedAt: "2026-10-29",
    sources: [{ id: "S1", publisher: "INSEE", title: "t", canonicalUrl: "https://www.insee.fr/x", accessedAt: "2026-10-29", license: "Licence ouverte", reuse: "allowed", language: "fr" }],
    observations: [observation()],
    claims: [],
    relationships: [],
    modules: {},
    ...overrides,
  };
}

test("la fiche France est valide et publiable", () => {
  const fra = france();
  assert.equal(fra.countryCode, "FRA");
  assert.deepEqual(publishProblems(fra), []);
});

test("toute observation publiée a une source, une période et un périmètre", () => {
  for (const item of publishedObservations(france())) {
    assert.ok(item.sourceIds.length > 0, item.id);
    assert.ok(item.referencePeriod.length > 0, item.id);
    assert.ok(item.geographicScope.length > 0, item.id);
    assert.ok(item.verifiedAt, item.id);
  }
});

test("une observation sans source ou sans année est refusée par le schéma", () => {
  assert.equal(ObservationSchema.safeParse(observation({ sourceIds: [] })).success, false);
  assert.equal(ObservationSchema.safeParse(observation({ referencePeriod: "" })).success, false);
  assert.equal(ObservationSchema.safeParse(observation()).success, true);
});

test("une fiche dont une affirmation ou une observation cite une source inconnue n'est pas publiable", () => {
  assert.ok(publishProblems(data({ observations: [observation({ sourceIds: ["INCONNUE"] })] })).some((problem) => problem.includes("source inconnue")));
  assert.deepEqual(publishProblems(data()), []);
});

test("SIPRI est exclue : par le registre, par l'éditeur et par les séries Banque mondiale qui la relaient", () => {
  assert.equal(isBlockedSource(SIPRI_ENTRY), true);
  const viaWorldBank = { ...data().sources[0], id: "S-WB", publisher: "Banque mondiale", datasetId: "MS.MIL.XPND.GD.ZS" };
  assert.equal(isBlockedSource(viaWorldBank), true);
  const sipriPublisher = { ...data().sources[0], id: "S-X", publisher: "SIPRI Yearbook", reuse: "allowed" as const };
  assert.equal(isBlockedSource(sipriPublisher), true);
  assert.ok(BLOCKED_WORLD_BANK_INDICATORS.includes("MS.MIL.XPND.GD.ZS"));
  const problems = publishProblems(data({ sources: [SIPRI_ENTRY, ...data().sources], observations: [observation({ sourceIds: ["S10-SIPRI"] })] }));
  assert.ok(problems.some((problem) => problem.includes("exclue")));
});

test("une observation issue d'une source exclue n'est jamais affichée", () => {
  const blocked = data({ sources: [SIPRI_ENTRY], observations: [observation({ sourceIds: ["S10-SIPRI"] })] });
  assert.deepEqual(publishedObservations(blocked), []);
  assert.equal(metricViews(blocked).size, 0);
});

test("la fiche France ne contient aucune source SIPRI ni série militaire de la Banque mondiale", () => {
  const fra = france();
  assert.equal(fra.sources.some(isBlockedSource), false);
  assert.equal(fra.sources.some((source) => /sipri|MS\.MIL/i.test(`${source.publisher} ${source.title} ${source.datasetId ?? ""} ${source.canonicalUrl}`)), false);
});

test("une valeur en attente de vérification n'est pas affichée mais reste signalée", () => {
  const pendingData = data({ observations: [observation({ id: "p-1", key: "politics.head_of_government", value: null, status: "pending", verifiedAt: null })] });
  assert.equal(metricViews(pendingData).has("politics.head_of_government"), false);
  assert.deepEqual(pendingObservations(pendingData).map((item) => item.key), ["politics.head_of_government"]);
});

test("le Premier ministre et le Conseil de sécurité sont publiés avec leurs sources, leur date et leur licence", () => {
  const views = metricViews(france());
  const pm = views.get("politics.head_of_government");
  assert.equal(pm?.value, "Sébastien Lecornu");
  assert.equal(pm?.validFrom, "26 février 2026");
  assert.ok(pm?.sources.some((source) => source.url === "https://www.info.gouv.fr/personnalite/sebastien-lecornu"));
  const unsc = views.get("institutions.unsc");
  assert.ok(unsc && unsc.sources.length === 2);
  assert.ok(unsc.sources.some((source) => source.url === "https://www.un.org/about-us/un-charter/chapter-5"));
});

test("les licences lues sont consignées : UE en CC BY, Élysée sous licence ouverte, OTAN en citation seule", () => {
  const sources = new Map(france().sources.map((source) => [source.id, source]));
  assert.equal(sources.get("S05-EU-FRA")?.reuse, "allowed");
  assert.match(sources.get("S05-EU-FRA")?.license ?? "", /CC BY 4.0/);
  assert.equal(sources.get("S17-ELYSEE")?.reuse, "allowed");
  assert.match(sources.get("S17-ELYSEE")?.license ?? "", /Licence ouverte/);
  assert.equal(sources.get("S06-NATO-MEMBERS")?.reuse, "citation_only");
  assert.ok(sources.get("S06-NATO-MEMBERS")?.licenseUrl);
});

test("les valeurs de la maquette de démonstration ne sont pas reprises", () => {
  const text = JSON.stringify(getApprocheData("FRA"));
  for (const forbidden of ["Barnier", "380 000", "3 130", "68,4", "Barkhane", "98 %", "12 mars 2025"]) assert.equal(text.includes(forbidden), false, forbidden);
  // Un nombre de la maquette n'est comparé qu'en entier : « 380000 » ne doit pas être trouvé dans 261238000000.
  assert.equal(/(?<!\d)380000(?!\d)/.test(text), false, "380000");
});

test("deux mesures de la population (Banque mondiale, Eurostat) sont gardées côte à côte, sans moyenne", () => {
  const views = metricViews(france());
  const world = views.get("demography.population");
  const eurostat = views.get("demography.population.eurostat");
  assert.ok(world && eurostat);
  assert.notEqual(world.period, eurostat.period);
  assert.ok(world.others.some((other) => other.period === eurostat.period));
  assert.ok(world.series.length >= 5, "l'historique alimente la courbe");
});

test("la fiche France publie des affirmations vérifiées, chacune avec sa source", () => {
  const claims = claimViews(france());
  assert.ok(claims.length >= 3);
  for (const claim of claims) assert.ok(claim.sources.length > 0, claim.id);
});

test("une fiche non publiée ne montre rien", () => {
  const draft = data({ publication: "draft" });
  assert.equal(metricViews(draft).size, 0);
  assert.deepEqual(claimViews(draft), []);
});

test("un pays non migré garde l'ancienne fiche", () => {
  assert.equal(getApprocheData("MLI"), null);
  assert.equal(getApprocheData(undefined), null);
});

test("le schéma refuse une fiche mal formée", () => {
  assert.equal(CountryDataSchema.safeParse({ countryCode: "FR" }).success, false);
});

test("mise en forme française des valeurs", () => {
  const population = observation({ key: "demography.population", value: 68720337, unit: "habitants" });
  assert.equal(formatValue(population), "68,7 millions");
  const gdp = observation({ key: "economy.gdp_nominal_usd", value: 3366315927447, unit: "USD" });
  assert.equal(formatWithUnit(gdp), "3 366 Md $ US", "milliards plutôt que « billions », espaces insécables : le nombre ne se coupe pas");
  assert.ok(!formatValue(gdp).includes(" "),"aucune espace sécable dans une valeur en milliards");
  const growth = observation({ key: "economy.gdp_growth", value: 0.84, unit: "%" });
  assert.equal(formatWithUnit(growth), "+0,8 %");
  assert.equal(formatValue(observation({ value: null })), "Donnée non disponible");
  assert.equal(formatDate("2026-10-29"), "29 octobre 2026");
  assert.equal(formatDate("2010"), "2010", "une année seule n'est pas transformée en 1er janvier");
});

test("les onglets sont des sous-pages pré-rendues, la vue d'ensemble est la page du pays", () => {
  assert.equal(tabHref("/zones/europe/approche/pays/france", "overview"), "/zones/europe/approche/pays/france");
  assert.equal(tabHref("/zones/europe/approche/pays/france", "defense"), "/zones/europe/approche/pays/france/defense");
  assert.equal(validateTab("defense"), "defense");
  assert.equal(validateTab("nimporte-quoi"), "overview");
  assert.deepEqual(listApprocheCountries(), [{ slug: "france", zoneSlug: "europe" }]);
});

test("les relations bilatérales publiées ont chacune leurs sources lues et sont classées par nature, sans classement ami / rival", () => {
  const relations = relationViews(france());
  assert.deepEqual(relations.map((relation) => relation.targetName).sort(), ["Allemagne", "Italie", "Royaume-Uni"]);
  for (const relation of relations) {
    assert.ok(relation.sources.length > 0, relation.id);
    assert.ok(["treaty", "cooperation", "tension"].includes(relation.type), relation.id);
  }
  const italy = relations.find((relation) => relation.targetName === "Italie");
  assert.equal(italy?.sources.length, 2, "signature et entrée en vigueur viennent de deux sources");
  assert.equal(relations.filter((relation) => relation.type === "tension").length, 0, "aucune divergence sans fait daté sourcé");
});

test("une relation sans source, ou dont la source est exclue, n'est pas publiable", () => {
  const relation = { id: "r-1", countryCode: "FRA", targetCode: "DEU", targetName: "Allemagne", relationType: "treaty" as const, title: "t", topics: [], summary: "s", validFrom: null, sourceIds: ["INCONNUE"], lastReviewedAt: "2026-10-29", status: "verified" as const };
  assert.ok(publishProblems(data({ relationships: [relation] })).some((problem) => problem.includes("source inconnue")));
  const blocked = data({ sources: [SIPRI_ENTRY], relationships: [{ ...relation, sourceIds: ["S10-SIPRI"] }] });
  assert.deepEqual(relationViews(blocked), []);
});

test("les organisations G7, G20 et OCDE sont publiées avec leur source France Diplomatie sous licence ouverte, l'OIF reste à vérifier", () => {
  const fra = france();
  const views = metricViews(fra);
  for (const key of ["institutions.g7", "institutions.g20", "institutions.oecd"]) {
    const metric = views.get(key);
    assert.ok(metric, key);
    assert.equal(metric.sources[0].publisher, "France Diplomatie");
    assert.equal(metric.sources[0].reuse, "allowed");
  }
  assert.equal(views.has("institutions.oif"), false);
  assert.ok(pendingObservations(fra).some((item) => item.key === "institutions.oif"));
});

test("les parts de valeur ajoutée par branche sont calculées, somment à 100 % et leurs valeurs somment au total Eurostat", () => {
  const views = metricViews(france());
  const codes = ["A", "B-E", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"];
  const amounts = codes.map((code) => views.get(`economy.value_added.${code}`)?.raw ?? Number.NaN);
  const shares = codes.map((code) => views.get(`economy.value_added_share.${code}`)?.raw ?? Number.NaN);
  const total = views.get("economy.value_added.total")?.raw ?? Number.NaN;
  assert.ok(amounts.every((value) => value > 0) && total > 0);
  assert.ok(Math.abs(amounts.reduce((sum, value) => sum + value, 0) - total) / total < 1e-6, "la somme des branches égale le total");
  assert.ok(Math.abs(shares.reduce((sum, value) => sum + value, 0) - 100) < 0.6, "les parts arrondies somment à 100 % à l'arrondi près");
  const share = france().observations.find((observation) => observation.key === "economy.value_added_share.A");
  assert.equal(share?.dataKind, "calculated");
  assert.ok(share?.calculationFormula);
});

test("l'électricité de RTE : les chiffres lus sont cohérents entre eux (exportations - importations = solde net)", () => {
  const views = metricViews(france());
  const value = (key: string) => views.get(`energy.electricity.${key}`)?.raw ?? Number.NaN;
  assert.equal(value("production_total"), 539);
  assert.equal(value("nuclear"), 361.7);
  assert.ok(Math.abs(value("exports_gross") - value("imports") - value("net_exports")) < 0.5);
  assert.ok(value("hydro") + value("wind_solar") <= value("renewable") + 0.5, "hydraulique + éolien/solaire sont compris dans le renouvelable");
  assert.ok(value("nuclear") + value("renewable") + value("fossil") <= value("production_total"));
});

test("la dette publique et la dépendance énergétique viennent d'Eurostat avec leur série trimestrielle ou annuelle", () => {
  const views = metricViews(france());
  const debt = views.get("economy.public_debt_gdp");
  const dependency = views.get("energy.import_dependency");
  assert.ok(debt && dependency);
  assert.match(debt.period, /^\d{4}-Q[1-4]$/);
  assert.ok(debt.series.length >= 4);
  assert.equal(debt.sources[0].publisher, "Eurostat");
  assert.equal(dependency.sources[0].publisher, "Eurostat");
  assert.equal(debt.sources[0].reuse, "allowed");
});

test("l'onglet Économie n'affiche aucune dépendance de la maquette", () => {
  const text = JSON.stringify(metricViews(france()));
  for (const forbidden of ["98", "terres rares", "Pétrole"]) assert.equal(text.includes(`"value":"${forbidden}`), false, forbidden);
});

// --- Données de démonstration et modules (schéma v1) ---

const demoRaw = () => JSON.parse(fs.readFileSync("data/approche-demo/FRA.demo.json", "utf8")) as unknown;

test("le fichier de démonstration est valide, marqué demo et ne cite aucune source réelle", () => {
  const { modules, countryCode } = parseDemoFile(demoRaw());
  assert.equal(countryCode, "FRA");
  assert.equal(containsDemo(modules), true);
  const text = JSON.stringify(modules);
  assert.equal(/"demo":false/.test(text), false, "tout élément identifiable est marqué demo");
  assert.equal(/"sourceIds":\["/.test(text), false, "la démonstration ne cite aucune source");
});

test("la démonstration n'est pas chargée sans la variable d'environnement (cas de la production)", async () => {
  assert.equal(demoEnabled(), false);
  assert.equal(await getDemoModules("FRA"), null);
});

test("la fiche France réelle ne contient aucun élément de démonstration", () => {
  const fra = france();
  assert.equal(containsDemo(fra.modules), false);
  assert.deepEqual(moduleProblems(fra.modules), []);
  assert.equal(fra.modules.defense?.threatPosture?.level, "Vigilance renforcée");
});

test("la fusion garde le réel et ne comble que ce qui manque, sans mélanger les éléments", () => {
  const { modules: demo } = parseDemoFile(demoRaw());
  const real = france().modules;
  const merged = mergeModules(real, demo);
  assert.equal(merged.defense?.threatPosture?.demo, false, "le dispositif réel l'emporte sur la démonstration");
  assert.equal(merged.defense?.threatPosture?.level, "Vigilance renforcée");
  assert.ok((merged.defense?.equipment.length ?? 0) > 0 && merged.defense?.equipment.every((item) => item.demo), "le reste vient de la démonstration");
  assert.ok((merged.outlook?.swot.strengths.length ?? 0) > 0, "un SWOT réel vide ne masque pas la démonstration");
  assert.equal(mergeModules(real, null).defense?.equipment.length, 0, "sans démonstration, rien n'est inventé");
});

test("une fiche réelle avec un élément de démonstration ou sans source est refusée", () => {
  const withDemo = data({ modules: { overview: { strengths: [{ id: "x", title: "t", summary: "", tags: [], sourceIds: ["S1"], demo: true }], challenges: [], timeline: [] } } });
  assert.ok(publishProblems(withDemo).some((problem) => problem.includes("démonstration")));
  const noSource = data({ modules: { overview: { strengths: [{ id: "x", title: "t", summary: "", tags: [], sourceIds: [], demo: false }], challenges: [], timeline: [] } } });
  assert.ok(publishProblems(noSource).some((problem) => problem.includes("aucune source")));
  const ok = data({ modules: { overview: { strengths: [{ id: "x", title: "t", summary: "", tags: [], sourceIds: ["S1"], demo: false }], challenges: [], timeline: [] } } });
  assert.deepEqual(publishProblems(ok), []);
});

test("l'exemple livré à ChatGPT est valide et publiable", () => {
  const raw = JSON.parse(fs.readFileSync("docs/exemples/APPROCHE_EXEMPLE.json", "utf8")) as unknown;
  const parsed = CountryDataSchema.safeParse(raw);
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
  assert.deepEqual(publishProblems(parsed.data), []);
  assert.equal(parsed.data.schemaVersion, 1);
});

test("une carte refuse une coordonnée impossible et une couleur mal formée", () => {
  const feature = { id: "f", name: "n", lat: 95, lon: 0, kind: "k" };
  assert.equal(MapLayerSchema.safeParse({ id: "l", title: "t", theme: "defense", color: "#e0b44c", features: [feature] }).success, false);
  assert.equal(MapLayerSchema.safeParse({ id: "l", title: "t", theme: "defense", color: "rouge", features: [{ ...feature, lat: 10 }] }).success, false);
  assert.equal(MapLayerSchema.safeParse({ id: "l", title: "t", theme: "defense", color: "#e0b44c", features: [{ ...feature, lat: 10 }] }).success, true);
});

// --- Médias, licences d'images, icônes (refonte visuelle) ---

test("une image à licence non confirmée n'est jamais affichée en production, seulement en démonstration", () => {
  const asset = { id: "a", path: "/x.webp", alt: "x", licenseStatus: "to_confirm" as const, focal: { x: 50, y: 50 }, subject: "" };
  assert.equal(displayable(asset, false), false);
  assert.equal(displayable(asset, true), true);
  assert.equal(displayable({ ...asset, licenseStatus: "cleared" }, false), false, "licence confirmée mais usage commercial non établi");
  assert.equal(displayable({ ...asset, licenseStatus: "cleared", commercialReuseAllowed: true }, false), true);
  assert.equal(displayable({ ...asset, licenseStatus: "unknown" }, false), false);
  assert.equal(displayable(null, true), false);
});

test("une fiche réelle qui renvoie à une image sans licence confirmée est refusée", () => {
  const asset = { id: "img", path: "/x.webp", alt: "x", licenseStatus: "to_confirm", focal: { x: 50, y: 50 }, subject: "" };
  assert.ok(moduleProblems({ media: { assets: [asset] } }).some((problem) => problem.includes("image sans licence confirmée")));
  assert.ok(moduleProblems({ media: { assets: [{ ...asset, licenseStatus: "cleared" }] } }).some((problem) => problem.includes("réutilisation commerciale")));
  assert.deepEqual(moduleProblems({ media: { assets: [{ ...asset, licenseStatus: "cleared", commercialReuseAllowed: true }] } }), []);
});

test("les images de démonstration sont déclarées à confirmer et existent sur le disque", () => {
  const { modules } = parseDemoFile(demoRaw());
  const assets = modules.media?.assets ?? [];
  assert.ok(assets.length >= 3);
  for (const asset of assets) {
    assert.equal(asset.licenseStatus, "to_confirm", asset.id);
    assert.ok(fs.existsSync(`public${asset.path}`), asset.path);
  }
  assert.ok(assets.some((asset) => asset.id === modules.hero?.imageId), "l'image du bandeau existe dans le catalogue");
});

test("la fiche France réelle ne contient aucune image : en production, un visuel neutre s'affiche", () => {
  assert.equal(france().modules.media, undefined);
  assert.equal(france().modules.hero, undefined);
});

test("les pictogrammes existent pour chaque type d'objet de carte et sujet courant", () => {
  assert.equal(iconForKind("Port"), "anchor");
  assert.equal(iconForKind("Base permanente"), "flag");
  assert.equal(iconForKind("Ambassade"), "building");
  assert.equal(iconForKind("Inconnu", "dot"), "dot");
  assert.equal(iconForTopic("Aéronautique et spatial"), "plane");
  assert.equal(iconForTopic("Armée de l'Air et de l'Espace"), "plane");
  assert.equal(iconForTopic("Quelque chose"), "factory");
  assert.equal(iconForMetric("demography.population"), "users");
  for (const name of ["users", "coins", "plane", "atom", "anchor", "shield", "handshake", "target", "radar"]) assert.ok(ICON_PATHS[name], name);
});
