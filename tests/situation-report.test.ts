import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSituationPrompt,
  parseSituationReport,
  psitLabel,
  reportThemes,
  shortItemDate,
  sortAndNumber,
  validateReportEdit,
  type SituationInputBrief,
} from "../lib/situationReport";

function brief(id: number, overrides: Partial<SituationInputBrief> = {}): SituationInputBrief {
  return {
    id,
    title: `Titre ${id}`,
    summary: "Résumé.",
    primary_theme: "conflicts",
    category: null,
    importance: "medium",
    veracity: "Confirmé",
    source_domains: ["france24.com"],
    published_at: "2026-10-03T10:00:00Z",
    image_url: null,
    ...overrides,
  };
}

const briefs = [brief(1), brief(2, { primary_theme: "politics" }), brief(3)];

function reply(items: unknown[], extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ title: "Idée maîtresse.", items, conclusion: "À court terme, rien.\n\nÀ moyen terme, peut-être.", ...extra });
}

test("Le lundi est l'édition 01, le jeudi l'édition 02 (heure de Paris)", () => {
  // Lundi 5 octobre 2026, 7 h 10 à Paris (heure d'été) = 5 h 10 UTC.
  assert.deepEqual(psitLabel("2026-10-05T05:10:00Z"), {
    year: 2026, week: 41, edition: "01", short: "S41 - 01", full: "POINT DE SITUATION S41 - 01",
  });
  // Jeudi 8 octobre 2026, 18 h 10 à Paris = 16 h 10 UTC.
  assert.equal(psitLabel("2026-10-08T16:10:00Z").short, "S41 - 02");
});

test("La semaine suit la date de Paris, pas celle d'UTC", () => {
  // Dimanche 4 octobre 22 h 30 UTC = lundi 5 octobre 0 h 30 à Paris.
  assert.equal(psitLabel("2026-10-04T22:30:00Z").short, "S41 - 01");
});

test("Numérotation ISO à la bascule d'année", () => {
  assert.equal(psitLabel("2026-12-31T16:00:00Z").short, "S53 - 02");
  assert.equal(psitLabel("2027-01-01T16:00:00Z").short, "S53 - 02");
  assert.equal(psitLabel("2027-01-04T05:00:00Z").short, "S01 - 01");
});

test("Les événements sont regroupés par thématique puis numérotés dans cet ordre", () => {
  const numbered = sortAndNumber([
    { theme: "politics", date: "2026-10-02", text: "b", place: null, lat: null, lon: null, brief_id: 2 },
    { theme: "conflicts", date: "2026-10-03", text: "c", place: null, lat: null, lon: null, brief_id: 1 },
    { theme: "conflicts", date: "2026-10-01", text: "a", place: null, lat: null, lon: null, brief_id: 3 },
    { theme: null, date: "2026-10-01", text: "z", place: null, lat: null, lon: null, brief_id: null },
  ]);
  assert.deepEqual(numbered.map((i) => [i.n, i.text]), [[1, "a"], [2, "c"], [3, "b"], [4, "z"]]);
});

test("Lecture d'une réponse valide : numérotation, texte nettoyé, coordonnées conservées", () => {
  const content = parseSituationReport(
    reply([
      { briefId: 2, theme: "politics", date: "2026-10-02", text: "Visite à Bamako.", place: "Bamako (Mali)", lat: 12.64, lon: -8.0 },
      { briefId: 1, theme: "conflicts", date: "2026-10-03", text: "Opération à Pama.", place: "Pama (Burkina Faso)", lat: 11.25, lon: 0.7 },
    ]),
    briefs,
    "afrique"
  );
  assert.equal(content.title, "Idée maîtresse");
  assert.deepEqual(content.items.map((i) => [i.n, i.brief_id, i.theme]), [[1, 1, "conflicts"], [2, 2, "politics"]]);
  assert.equal(content.items[0].lat, 11.25);
});

test("Un événement dont la synthèse source est inconnue est écarté", () => {
  const content = parseSituationReport(
    reply([
      { briefId: 999, theme: "conflicts", date: "2026-10-03", text: "Inventé." },
      { briefId: 1, theme: "conflicts", date: "2026-10-03", text: "Réel." },
    ]),
    briefs,
    "afrique"
  );
  assert.equal(content.items.length, 1);
  assert.equal(content.items[0].text, "Réel.");
});

test("Une coordonnée hors du cadre de la zone est supprimée, pas déplacée", () => {
  const [item] = parseSituationReport(
    reply([{ briefId: 1, theme: "conflicts", date: "2026-10-03", text: "Faux lieu.", place: "Ailleurs", lat: 48.85, lon: 2.35 }]),
    briefs,
    "indopacifique"
  ).items;
  assert.equal(item.lat, null);
  assert.equal(item.lon, null);
  assert.equal(item.place, "Ailleurs");
});

test("Un couple de coordonnées incomplet n'est pas gardé", () => {
  const [item] = parseSituationReport(
    reply([{ briefId: 1, theme: "conflicts", date: "2026-10-03", text: "Texte.", lat: 12 }]),
    briefs,
    "afrique"
  ).items;
  assert.equal(item.lat, null);
  assert.equal(item.lon, null);
});

test("Thématique ou date invalides : repli sur celles de la synthèse source", () => {
  const [item] = parseSituationReport(
    reply([{ briefId: 2, theme: "n'importe quoi", date: "hier", text: "Texte." }]),
    briefs,
    "afrique"
  ).items;
  assert.equal(item.theme, "politics");
  assert.equal(item.date, "2026-10-03");
});

test("Réponses inexploitables : rejetées", () => {
  assert.throws(() => parseSituationReport("pas du JSON", briefs, "afrique"));
  assert.throws(() => parseSituationReport(reply([]), briefs, "afrique"), /Aucun événement valide/);
  assert.throws(() => parseSituationReport(JSON.stringify({ title: "T", items: [] }), briefs, "afrique"));
  assert.throws(
    () => parseSituationReport(reply([{ briefId: 1, text: "ok" }], { conclusion: "  " }), briefs, "afrique"),
    /Conclusion manquante/
  );
});

test("Le prompt interdit d'inventer et demande des lieux sûrs", () => {
  const prompt = buildSituationPrompt("Afrique", briefs, new Date("2026-10-01T16:00:00Z"), new Date("2026-10-05T05:00:00Z"));
  assert.match(prompt, /N'invente aucun fait/);
  assert.match(prompt, /capitale/);
  assert.match(prompt, /certains analystes/);
  assert.match(prompt, /\[#1\]/);
});

test("Validation de l'écran de relecture", () => {
  const good = {
    title: "Titre",
    conclusion: "Conclusion.",
    image_url: "  ",
    items: [{ theme: "conflicts", date: "2026-10-03", text: "Texte", place: " ", lat: "x", lon: 3, brief_id: 4 }],
  };
  const edit = validateReportEdit(good);
  assert.ok(edit);
  assert.equal(edit.image_url, null);
  assert.equal(edit.items[0].place, null);
  assert.equal(edit.items[0].lat, null);
  assert.equal(edit.items[0].lon, null);

  assert.equal(validateReportEdit({ ...good, title: "" }), null);
  assert.equal(validateReportEdit({ ...good, items: [{ ...good.items[0], date: "03/10" }] }), null);
  assert.equal(validateReportEdit({ ...good, items: [{ ...good.items[0], text: "" }] }), null);
  assert.equal(validateReportEdit(null), null);
});

test("Dates courtes et thématiques dominantes", () => {
  assert.equal(shortItemDate("2026-05-03"), "03/05/26");
  assert.deepEqual(
    reportThemes([{ theme: "politics" }, { theme: "conflicts" }, { theme: "conflicts" }, { theme: null }]),
    ["conflicts", "politics"]
  );
});
