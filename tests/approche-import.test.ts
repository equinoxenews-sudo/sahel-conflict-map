import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { classifyObservations } from "../lib/approche/complements";
import { AUTOMATIC_SERIES } from "../lib/approche/keys";
import { coverageProfile, longTexts } from "../lib/approche/levels";
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

test("les adresses des sources et des licences sont extraites pour le contrôle réseau", () => {
  const urls = urlsOf({ sources: [{ canonicalUrl: "https://a.example/x", licenseUrl: "https://a.example/licence" }, { canonicalUrl: "https://b.example/y", licenseUrl: null }] });
  assert.deepEqual(urls, ["https://a.example/x", "https://a.example/licence", "https://b.example/y"]);
});

test("les textes identiques entre pays et les textes répétés sont signalés, sans bloquer (gabarit non personnalisé)", () => {
  assert.deepEqual(moduleStrings({ a: { summary: "Un texte suffisamment long pour compter comme contenu éditorial répété." }, id: "x" }), ["Un texte suffisamment long pour compter comme contenu éditorial répété."]);
  for (const code of BATCH) {
    const report = analyzeCountry(read(code), `${code}.json`, ctx());
    assert.ok(report.warnings.some((warning) => warning.startsWith("[textes identiques entre pays]")), `${code} : textes de gabarit communs aux autres pays`);
    assert.ok(report.warnings.some((warning) => warning.startsWith("[textes répétés]")), `${code} : textes répétés dans la fiche`);
    assert.equal(report.ok, true, "un avertissement documentaire ne bloque pas l'enregistrement");
  }
  // Un pays sans texte commun avec les autres n'a pas cet avertissement.
  const lonely = analyzeCountry(read("FRA"), "FRA.json", { ...ctx(), peers: [] });
  assert.ok(!lonely.warnings.some((warning) => warning.startsWith("[textes identiques entre pays]")));
});

test("le rapport signale, en avertissements, les sources jamais référencées, les topics sans regroupement d'indicateurs, les libellés incohérents et les données invisibles", () => {
  const raw = clone(read("BFA"));
  raw.sources.push({ id: "S-BFA-ORPHELINE", publisher: "Organisme", title: "Source jamais citée", canonicalUrl: "https://example.org/orpheline", accessedAt: "2026-11-02", license: null, reuse: "citation_only", language: "fr" });
  // Libellé incohérent : une année absente de la période ; même libellé pour deux clés.
  raw.observations[0].label = "Capitale en 2031";
  raw.observations.push({ ...clone(raw.observations[1]), id: "bfa-double", key: "politics.head_of_state_bis", label: String(raw.observations[1].label) });
  // Observation sans label ni rubrique connue : visible nulle part.
  raw.observations.push({ ...clone(raw.observations[1]), id: "bfa-invisible", key: "mystere.sans_rubrique", label: null, topic: null });
  const report = analyzeCountry(raw, "BFA.json", ctx());
  assert.equal(report.ok, true, "ce sont des avertissements : aucune décision éditoriale n'est bloquée par le moteur");
  const has = (prefix: string, text: string) => report.warnings.some((warning) => warning.startsWith(prefix) && warning.includes(text));
  assert.ok(has("[sources jamais référencées]", "S-BFA-ORPHELINE"));
  assert.ok(has("[topic]", "« politics »"), "un mot de domaine ne regroupe pas d'indicateurs");
  assert.ok(has("[libellés]", "identity.capital"), "année du libellé absente de la période");
  assert.ok(has("[libellés]", "même libellé pour plusieurs clés"));
  assert.ok(has("[données invisibles]", "mystere.sans_rubrique"));
  // Clés institutionnelles : « Membre de l'UEMOA » est porté par institutions.uemoa (Mali) et institutions.waemu (Burkina).
  assert.ok(has("[libellés]", "institutions.waemu") || has("[libellés]", "clé institutions.waemu"), "clé à harmoniser entre pays");
});

test("un topic qui regroupe des mesures comparables de sources différentes, ou rejoint une tuile, n'est pas signalé", () => {
  const raw = clone(read("MLI"));
  const report = analyzeCountry(raw, "MLI.json", ctx());
  assert.ok(!report.warnings.some((warning) => warning.startsWith("[topic]") && warning.includes("« growth »")), "growth rejoint la tuile de croissance");
});

test("les niveaux ne sont ni calculés ni affichés automatiquement : ils sont déclarés, et le profil de couverture éclaire la décision", () => {
  const page = fs.readFileSync("components/approche/ApprocheCountryPage.tsx", "utf8");
  assert.match(page, /data\.documentationLevel \? \(/, "le niveau n'est affiché que s'il est déclaré");
  assert.ok(!page.includes("assessLevel"));
  for (const code of [...PILOTS, ...BATCH]) assert.equal(read(code).documentationLevel, undefined, `${code} : aucun niveau déclaré`);

  const profile = (code: string) => {
    const data = loadApprocheCountry(code) as CountryData;
    const peers = [...PILOTS, ...BATCH].filter((other) => other !== code).flatMap((other) => [...longTexts((loadApprocheCountry(other) as CountryData).modules)]);
    return coverageProfile(data, new Set(peers));
  };
  const fra = profile("FRA");
  const ben = profile("BEN");
  for (const item of [fra, ben]) {
    assert.ok(item.coverage.score >= 0 && item.coverage.score <= 1 && item.sources.score >= 0 && item.sources.score <= 1);
    assert.ok(item.coverage.blocks.length >= 15, "couverture mesurée bloc par bloc");
  }
  assert.ok((ben.specific.score ?? 1) < (fra.specific.score ?? 0), "les textes de gabarit du lot abaissent la part de contenu spécifique");
  assert.equal(coverageProfile(loadApprocheCountry("FRA") as CountryData, null).specific.parts[0].value, null, "sans autre pays, le caractère spécifique n'est pas évalué");

  // Le niveau déclaré n'est qu'une information : le même fichier, avec ou sans niveau, est classé à l'identique par le moteur.
  const data = loadApprocheCountry("BEN") as CountryData;
  const withLevel = CountryDataSchema.parse({ ...data, documentationLevel: "extended" });
  assert.deepEqual([...classifyObservations(withLevel)], [...classifyObservations(data)]);
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
