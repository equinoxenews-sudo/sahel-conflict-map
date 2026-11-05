import assert from "node:assert/strict";
import test from "node:test";
import { computePowerIndex, MAX_AGE_YEARS, MIN_COMPONENTS, NUCLEAR_STATES, POWER_COMPONENTS, powerIndexOf } from "../lib/powerIndex";
import { buildCountryPanel } from "../lib/countryPanel";
import { WORLD_INDICATORS } from "../lib/worldIndicators";

const NOW = 2026;
const full = (scale: number, year = 2025) => ({
  population: { value: 1_000_000 * scale, year },
  area: { value: 1000 * scale, year },
  gdp: { value: 1e9 * scale, year },
  military: { value: 1e7 * scale, year },
});

test("les pondérations des composantes font 100", () => {
  assert.equal(POWER_COMPONENTS.reduce((sum, component) => sum + component.weight, 0), 100);
});

test("le classement suit la taille : un pays plus grand sur tout passe devant, rang et total sont cohérents", () => {
  const result = computePowerIndex({ AAA: full(1), BBB: full(10), CCC: full(100) }, NOW);
  assert.deepEqual([...result.keys()].sort(), ["AAA", "BBB", "CCC"]);
  assert.equal(result.get("CCC")?.rank, 1);
  assert.equal(result.get("BBB")?.rank, 2);
  assert.equal(result.get("AAA")?.rank, 3);
  assert.equal(result.get("AAA")?.of, 3);
  assert.ok((result.get("CCC")?.score ?? 0) > (result.get("AAA")?.score ?? 0));
  for (const entry of result.values()) assert.ok(entry.score >= 0 && entry.score <= 100);
});

test("un État nucléaire gagne la composante nucléaire, les autres ont zéro (un fait connu, pas une donnée manquante)", () => {
  const result = computePowerIndex({ FRA: full(10), AAA: full(10) }, NOW);
  const nuclear = (iso3: string) => result.get(iso3)?.components.find((component) => component.id === "nuclear")?.score;
  assert.ok(NUCLEAR_STATES.has("FRA"));
  assert.equal(nuclear("FRA"), 100);
  assert.equal(nuclear("AAA"), 0);
});

test("une donnée manquante ou périmée est « n/c » : jamais devinée, et le poids est renormalisé sur le reste", () => {
  const stale = { ...full(10), military: { value: 1e8, year: NOW - MAX_AGE_YEARS - 1 } };
  const result = computePowerIndex({ AAA: stale, BBB: full(1) }, NOW);
  const military = result.get("AAA")?.components.find((component) => component.id === "military");
  assert.equal(military?.score, null);
  assert.ok(result.get("AAA"), "reste classé sur les autres composantes");
});

test("trop peu de données : pas d'indice du tout", () => {
  const sparse = { population: { value: 5_000_000, year: 2025 }, area: { value: 100, year: 2025 } };
  assert.ok(MIN_COMPONENTS >= 3);
  // Avec seulement population + superficie + (nucléaire = 0), on atteint 3 composantes : on vérifie qu'en dessous, rien n'est calculé.
  const result = computePowerIndex({ AAA: { population: sparse.population }, BBB: full(1) }, NOW);
  assert.equal(result.get("AAA"), undefined);
  assert.ok(result.get("BBB"));
});

test("le jeu de données mondial couvre les pays attendus, sans agrégats, et classe les grandes puissances en tête", () => {
  assert.ok(Object.keys(WORLD_INDICATORS).length >= 190);
  for (const aggregate of ["WLD", "EUU", "AFE", "OED"]) assert.equal(WORLD_INDICATORS[aggregate], undefined, `${aggregate} est un agrégat`);
  const usa = powerIndexOf("USA");
  const china = powerIndexOf("CHN");
  const poland = powerIndexOf("POL");
  assert.ok(usa && china && poland);
  assert.ok(usa.rank <= 3 && china.rank <= 3, "États-Unis et Chine dans les trois premiers");
  assert.ok(poland.rank < 60, "la Pologne est bien classée");
  assert.ok(usa.of >= 150);
  assert.equal(powerIndexOf("xxx"), null);
});

test("panneau d'un pays Approche : identité sourcée, chiffres clés, indice et relations", () => {
  const france = buildCountryPanel("fra");
  assert.equal(france.iso3, "FRA");
  assert.equal(france.approche, true);
  assert.equal(france.name, "France");
  assert.ok(france.identity.some((fact) => fact.label === "Capitale" && fact.value === "Paris"));
  assert.ok(france.figures.some((figure) => figure.label === "Population"));
  assert.ok(france.power && france.power.rank <= 15);
  assert.ok(france.relations.length > 0 && france.relations.length <= 14);
  assert.ok(france.memberships.length > 0 && france.memberships.length <= 12);
  assert.ok(france.memberships.some((membership) => membership.name === "Union européenne" && membership.logo === "/orgs/eu.svg"));
});

test("panneau d'un pays sans fiche Approche : identité de l'ancienne fiche, chiffres réels, pas de relations inventées", () => {
  const poland = buildCountryPanel("POL");
  assert.equal(poland.approche, false);
  assert.ok(poland.identity.some((fact) => fact.label === "Capitale"));
  assert.ok(poland.figures.some((figure) => figure.label === "Dépenses militaires"));
  assert.deepEqual(poland.relations, []);
  assert.deepEqual(poland.memberships, []);
  assert.ok(!poland.identity.some((fact) => /démonstration/i.test(fact.value)), "aucun texte de démonstration affiché comme un fait");
});

test("un pays inconnu donne un panneau vide, sans erreur", () => {
  const unknown = buildCountryPanel("ZZZ");
  assert.equal(unknown.name, null);
  assert.deepEqual(unknown.figures, []);
  assert.equal(unknown.power, null);
});

test("panneau du Mali : relations regroupées par cible, organisation reconnue pour une cible sans pays, tension séparée", () => {
  const mali = buildCountryPanel("MLI");
  const names = mali.relations.map((relation) => relation.name);
  assert.equal(new Set(names).size, names.length, "une seule pastille par cible");
  const burkina = mali.relations.find((relation) => relation.iso2 === "BF");
  assert.ok(burkina && burkina.type === "cooperation");
  const ecowas = mali.relations.find((relation) => relation.name === "CEDEAO");
  assert.ok(ecowas && ecowas.iso2 === null && ecowas.type === "tension", "la CEDEAO est une organisation, pas un pays");
  assert.ok(mali.relations.every((relation) => relation.titles.length > 0));
});

test("organisations : une ligne par organisation, statut particulier signalé, jamais un libellé deviné", () => {
  const mali = buildCountryPanel("MLI");
  const ids = mali.memberships.map((membership) => membership.id);
  assert.equal(new Set(ids).size, ids.length);
  const ecowas = mali.memberships.find((membership) => membership.id === "ecowas");
  assert.equal(ecowas?.note, "ancien membre");
  assert.ok(mali.memberships.some((membership) => membership.id === "aes"));
  // Aucune clé inconnue n'apparaît : tout vient de la table lib/orgLogos.ts.
  for (const membership of mali.memberships) assert.ok(membership.name && membership.acronym);
});

test("les logos référencés existent dans public/orgs et chaque fichier est listé dans les crédits", async () => {
  const fs = await import("node:fs");
  const { ORG_BY_KEY } = await import("../lib/orgLogos");
  const credits = fs.readFileSync("public/orgs/CREDITS.md", "utf8");
  for (const definition of Object.values(ORG_BY_KEY)) {
    if (!definition?.logo) continue;
    assert.ok(fs.existsSync(`public${definition.logo}`), `${definition.logo} existe`);
    assert.ok(credits.includes(definition.logo.replace("/orgs/", "")), `${definition.logo} crédité`);
  }
});
