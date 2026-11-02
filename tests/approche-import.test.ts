import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { classifyObservations } from "../lib/approche/complements";
import { AUTOMATIC_SERIES } from "../lib/approche/keys";
import { assessLevel, missingForLevel } from "../lib/approche/levels";
import { comparableMeasures, isOtherSourceOf, unitFamily } from "../lib/approche/measures";
import { COUNTRY_FILES } from "../lib/approche/registry.generated";
import { getApprocheData, listApprocheCountries, loadApprocheCountry } from "../lib/approche/repository";
import { CountryDataSchema, type CountryData, type Observation } from "../lib/approche/schema";
import { listCountryFiles } from "../scripts/lib/approcheContract";
import { analyzeCountry, checkBatch, moduleStrings, registeredCountries, urlsOf, type ImportContext } from "../scripts/lib/approcheImport";

// Import par lot : le contrôle d'un fichier ne dépend d'aucun code propre à un pays. Les pays enregistrés (France, Mali, Chine et le lot
// de cinq pays d'Afrique de l'Ouest) passent tous par le même moteur.

const ROOT = process.cwd();
const read = (code: string) => JSON.parse(fs.readFileSync(`data/approche/${code}.json`, "utf8")) as Record<string, unknown> & { observations: Record<string, unknown>[]; sources: Record<string, unknown>[] };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
// Contexte : tous les pays déjà enregistrés sauf celui qu'on contrôle (un pays ne collisionne pas avec lui-même).
const ctx = (): ImportContext => ({ root: ROOT, registered: registeredCountries(ROOT) });

const PILOTS = ["FRA", "MLI", "CHN"];
const BATCH = ["BEN", "NGA", "GHA", "GIN", "BFA"];

test("le registre des pays est généré à partir de data/approche : aucun pays n'est écrit à la main dans repository.ts", () => {
  const files = listCountryFiles(ROOT).map((entry) => entry.code);
  assert.deepEqual(Object.keys(COUNTRY_FILES).sort(), files.sort());
  for (const code of [...PILOTS, ...BATCH]) assert.ok(COUNTRY_FILES[code], `${code} enregistré`);
  const repository = fs.readFileSync("lib/approche/repository.ts", "utf8");
  assert.ok(!/\b(FRA|MLI|CHN|BEN|NGA|GHA|GIN|BFA)\b/.test(repository.replace(/\/\/.*$/gm, "")), "repository.ts ne cite aucun pays");
});

test("les cinq pays du lot restent en brouillon : rien n'est publié par l'import", () => {
  for (const code of BATCH) {
    assert.equal(read(code).publication, "draft", code);
    assert.equal(getApprocheData(code), null, `${code} n'est pas servi au public tant qu'il est en brouillon`);
    assert.ok(loadApprocheCountry(code), `${code} : fiche valide et publiable une fois validée`);
  }
  assert.deepEqual(
    listApprocheCountries().map((country) => country.slug),
    ["france"],
    "seule la France est publiée",
  );
});

test("les clés des séries automatiques réservées correspondent à celles du script de la Banque mondiale", () => {
  const script = fs.readFileSync("scripts/sync-approche-worldbank.ts", "utf8");
  const fromScript = [...script.matchAll(/\{ key: "([^"]+)", code: "[^"]+", unit: "[^"]+"(?:, currency: "[^"]+")?, topic: "([^"]+)"/g)].map((match) => ({ key: match[1], topic: match[2] }));
  assert.deepEqual(AUTOMATIC_SERIES.map((series) => ({ ...series })), fromScript);
});

test("les fiches déjà enregistrées passent le contrôle d'import sans erreur (même moteur pour tous les pays)", () => {
  for (const code of [...PILOTS, ...BATCH]) {
    const report = analyzeCountry(read(code), `${code}.json`, ctx());
    assert.deepEqual(Object.values(report.errors).flat(), [], `${code} : ${JSON.stringify(report.errors)}`);
    assert.equal(report.ok, true);
    assert.deepEqual(
      report.hidden.filter((item) => !item.reason.startsWith("masquée volontairement")),
      [],
      `${code} : observation vérifiée sans emplacement`,
    );
  }
});

test("le contrôle refuse chaque famille d'anomalie, avec un message par pays", () => {
  const base = () => clone(read("BEN"));
  const run = (raw: unknown, name = "BEN.json") => analyzeCountry(raw, name, ctx());

  // Schéma
  const noPeriod = base();
  delete noPeriod.observations[0].referencePeriod;
  assert.ok(run(noPeriod).errors.schema.some((message) => message.includes("referencePeriod")), "période obligatoire");
  assert.equal(run({ countryCode: "XXX" }).ok, false);

  // Références : une observation cite une source qui n'existe pas
  const orphan = base();
  orphan.observations[0].sourceIds = ["S-INEXISTANTE"];
  assert.ok(run(orphan).errors.publication.some((message) => message.includes("S-INEXISTANTE")), "référence cassée");

  // Licences : une source de SIPRI est refusée, même relayée
  const sipri = base();
  sipri.sources[0].publisher = "SIPRI";
  assert.ok(run(sipri).errors.publication.length > 0, "source exclue");

  // Collisions : doublon de clé, clé réservée aux séries automatiques
  const duplicate = base();
  duplicate.observations.push({ ...clone(duplicate.observations[0]), id: "ben-duplicate" });
  assert.ok(run(duplicate).errors.collisions.some((message) => message.includes("identity.capital")));
  const reserved = base();
  reserved.observations[0].key = "economy.gdp_growth";
  assert.ok(run(reserved).errors.collisions.some((message) => message.includes("réservée aux séries automatiques")));

  // Enregistrement : nom de fichier, zone, adresse prise par un autre pays, fiche inconnue
  assert.ok(run(base(), "XXX.json").errors.registry.some((message) => message.includes("nom de fichier")));
  const zone = base();
  zone.zoneSlug = "atlantide";
  assert.ok(run(zone).errors.registry.some((message) => message.includes("zone inconnue")));
  const taken = base();
  taken.slug = "mali";
  assert.ok(run(taken).errors.registry.some((message) => message.includes("déjà prise par MLI")));
  const unknown = base();
  unknown.slug = "pays-imaginaire";
  assert.ok(run(unknown).errors.registry.some((message) => message.includes("aucune fiche pays connue")));
  assert.equal(run(unknown).ok, false);
});

test("un lot est refusé pays par pays : deux fichiers ne portent ni le même code ni la même adresse", () => {
  const one = analyzeCountry(read("BEN"), "BEN.json", ctx());
  const two = analyzeCountry(read("BEN"), "BEN-bis.json", ctx());
  checkBatch([
    { report: one, slug: "benin" },
    { report: two, slug: "benin" },
  ]);
  assert.equal(one.ok, false);
  assert.ok(one.errors.registry.some((message) => message.includes("plusieurs fichiers du lot")));
});

test("les textes passe-partout et répétés sont signalés (gabarit non personnalisé)", () => {
  const strings = moduleStrings({ a: { summary: "Un texte suffisamment long pour compter comme contenu éditorial répété." }, id: "x" });
  assert.deepEqual(strings, ["Un texte suffisamment long pour compter comme contenu éditorial répété."]);
  const reports = BATCH.map((code) => ({ report: analyzeCountry(read(code), `${code}.json`, ctx()), slug: String(read(code).slug), strings: moduleStrings(read(code).modules) }));
  checkBatch(reports);
  for (const { report } of reports) {
    assert.ok(report.warnings.some((warning) => warning.includes("identique(s) dans au moins 3 pays du lot")), `${report.code} : textes de gabarit communs aux cinq pays`);
    assert.equal(report.ok, true, "un avertissement documentaire ne bloque pas l'enregistrement");
  }
});

test("les adresses des sources et des licences sont extraites pour le contrôle réseau", () => {
  const urls = urlsOf({ sources: [{ canonicalUrl: "https://a.example/x", licenseUrl: "https://a.example/licence" }, { canonicalUrl: "https://b.example/y", licenseUrl: null }] });
  assert.deepEqual(urls, ["https://a.example/x", "https://a.example/licence", "https://b.example/y"]);
});

test("deux niveaux documentaires, un seul moteur : le niveau ne change ni le classement ni l'affichage", () => {
  const levels = Object.fromEntries([...PILOTS, ...BATCH].map((code) => [code, assessLevel(loadApprocheCountry(code) as CountryData).achieved]));
  for (const code of PILOTS) assert.equal(levels[code], "extended", `${code} : approfondi`);
  for (const code of BATCH) assert.equal(levels[code], "essential", `${code} : essentiel (5 affirmations vérifiées sur 6 attendues pour l'approfondi)`);

  // Le niveau déclaré n'est qu'une information : le même fichier, déclaré « essential » ou « extended », est classé à l'identique.
  const data = loadApprocheCountry("BEN") as CountryData;
  const withLevel = CountryDataSchema.parse({ ...data, documentationLevel: "extended" });
  assert.deepEqual([...classifyObservations(withLevel)], [...classifyObservations(data)]);
  // Un niveau déclaré non atteint est signalé à l'import, sans bloquer.
  const declared = { ...read("BEN"), documentationLevel: "extended" };
  const report = analyzeCountry(declared, "BEN.json", ctx());
  assert.equal(report.ok, true);
  assert.ok(report.warnings.some((warning) => warning.includes("déclaré mais non atteint")));
  assert.ok(missingForLevel(assessLevel(data), "extended").length > 0);
  assert.deepEqual(missingForLevel(assessLevel(loadApprocheCountry("FRA") as CountryData), "extended"), []);
});

test("même grandeur seulement : un chef d'État et une durée de mandat ne sont pas « d'autres sources » l'un de l'autre", () => {
  const make = (overrides: Partial<Observation>): Observation => ({ ...(read("BEN").observations[0] as unknown as Observation), ...overrides });
  const head = make({ id: "a", key: "politics.head_of_state", topic: "politics", value: "Nom", unit: null, sourceIds: ["S1"] });
  const term = make({ id: "b", key: "politics.term_years", topic: "politics", value: 5, unit: "ans", sourceIds: ["S2"] });
  assert.equal(isOtherSourceOf(head, term), false, "texte et nombre ne se comparent pas");
  const populationA = make({ id: "c", topic: "population", value: 100, unit: "habitants", sourceIds: ["S1"] });
  const populationB = make({ id: "d", topic: "population", value: 101, unit: "personnes", sourceIds: ["S2"] });
  assert.equal(isOtherSourceOf(populationA, populationB), true, "habitants et personnes : même famille d'unités");
  assert.equal(isOtherSourceOf(populationA, { ...populationB, sourceIds: ["S1"] }), false, "même source : deux mesures d'un même document");
  assert.equal(unitFamily("milliards EUR"), unitFamily("USD"));
  assert.equal(comparableMeasures(populationA, make({ id: "e", value: 3, unit: "%" })), false);
});
