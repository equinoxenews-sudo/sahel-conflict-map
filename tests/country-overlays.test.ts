import test from "node:test";
import assert from "node:assert/strict";
import { getCountryProfile } from "../lib/countries";
import { applyCountryOverlay, getResolvedCountryProfile, isIntegratedProfile } from "../lib/countryOverlays";
import europe from "../data/country-profiles/europe.json";

const INFRA_TYPES = ["Port", "Aéroport", "Route", "Chemin de fer", "Pipeline", "Énergie", "Télécommunications", "Base"];
const INFRA_IMPORTANCE = ["Stratégique", "Régionale", "Locale"];
const INFRA_STATUS = ["Actif", "Endommagé", "Hors service", "Inconnu"];
const SOURCE_TYPES = ["institutional", "media", "osint", "database", "other"];

test("Le lot Europe couvre exactement les pays Europe du dépôt", () => {
  assert.equal(europe.countries.length, europe.countryCount);
  for (const country of europe.countries) {
    const base = getCountryProfile(country.slug);
    assert.ok(base, `pays absent du dépôt : ${country.slug}`);
    assert.equal(base.zoneSlug, "europe");
  }
});

test("L'identité du dépôt fait foi (Kosovo : l'identifiant de carte reste CS-KM)", () => {
  const kosovo = getResolvedCountryProfile("kosovo");
  assert.ok(kosovo);
  assert.equal(kosovo.iso3, "CS-KM");
  assert.equal(kosovo.slug, getCountryProfile("kosovo")?.slug);
});

test("Les valeurs null du lot ne sont jamais remplacées ni affichées", () => {
  const albanie = getResolvedCountryProfile("albanie");
  assert.ok(albanie);
  assert.equal(albanie.population, undefined);
  assert.equal(albanie.economy?.gdp, undefined);
  assert.equal(albanie.politics?.headOfState, undefined);
  assert.equal(albanie.capital, "Tirana");
});

test("Une fiche intégrée n'a plus de contenu de démonstration et porte ses dates", () => {
  for (const country of europe.countries) {
    const profile = getResolvedCountryProfile(country.slug);
    assert.ok(profile);
    assert.ok(isIntegratedProfile(profile), country.slug);
    assert.doesNotMatch(JSON.stringify(profile), /démonstration/i, country.slug);
    assert.match(profile.lastCheckedAt ?? "", /^\d{4}-\d{2}-\d{2}$/);
    assert.match(profile.lastUpdatedAt ?? "", /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(profile.updatedAt, profile.lastUpdatedAt);
    assert.ok(profile.sources.length >= 1, `sources : ${country.slug}`);
  }
});

test("Contrôlé n'est pas modifié : lastCheckedAt et lastUpdatedAt restent distincts", () => {
  const base = getCountryProfile("albanie");
  assert.ok(base);
  const checked = applyCountryOverlay(base, { slug: "albanie", lastCheckedAt: "2026-10-20", lastUpdatedAt: "2026-09-26", sources: [] });
  assert.equal(checked.lastCheckedAt, "2026-10-20");
  assert.equal(checked.lastUpdatedAt, "2026-09-26");
  assert.equal(checked.updatedAt, "2026-09-26");
});

test("Infrastructures et sources respectent les types de l'application", () => {
  for (const country of europe.countries) {
    for (const infra of country.infrastructures) {
      assert.ok(INFRA_TYPES.includes(infra.type), `${country.slug} : type ${infra.type}`);
      assert.ok(INFRA_IMPORTANCE.includes(infra.importance), `${country.slug} : importance ${infra.importance}`);
      assert.ok(INFRA_STATUS.includes(infra.status), `${country.slug} : statut ${infra.status}`);
    }
    for (const source of country.sources) {
      assert.ok(SOURCE_TYPES.includes(source.type), `${country.slug} : source ${source.type}`);
      assert.ok(source.id && source.title, country.slug);
    }
  }
});

test("Un pays sans lot garde sa fiche actuelle", () => {
  const mali = getResolvedCountryProfile("mali");
  assert.ok(mali);
  assert.equal(isIntegratedProfile(mali), false);
});
