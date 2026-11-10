import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { Note } from "../lib/supervision/core/notes";
import type { BoardEvent } from "../lib/supervision/dashboard/fixtures";
import { pdfText, renderPdf, wrap } from "../lib/supervision/export/pdf";
import { LIMITS, buildReport, isExportPeriod, reportFilename, type ReportInput } from "../lib/supervision/export/report";

const NOW = new Date("2026-11-10T12:00:00Z");
const ev = (id: string, extra: Partial<BoardEvent> = {}): BoardEvent => ({
  id,
  kind: "article",
  title: `Événement ${id}`,
  theme: "securite",
  priority: "information",
  verification: "signalement",
  at: "2026-11-08T10:00:00Z",
  place: "Nigeria",
  publications: 1,
  url: `https://example.com/${id}`,
  domains: ["example.com"],
  ...extra,
});

const base = (events: BoardEvent[], extra: Partial<ReportInput> = {}): ReportInput => ({
  supervision: { name: "Test Nigeria", state: "active" },
  scope: { countries: ["Nigeria"], objective: "Sécurité et conflits", keywords: ["bandits"], entities: [], exclusions: ["football"] },
  events,
  coverage: { articles: 0, signals: 0, publications: 0, merged: 0, grouped: 0, latest: "2026-11-10T05:00:00Z", truncated: false },
  period: 30,
  decisions: new Map(),
  notes: null,
  generatedAt: NOW,
  ...extra,
});

const sectionOf = (report: ReturnType<typeof buildReport>, heading: string) => report.sections.find((s) => s.heading === heading);
const allText = (report: ReturnType<typeof buildReport>) => JSON.stringify(report);

test("le rapport reprend le périmètre, la période, la date de génération et le dernier fait connu", () => {
  const report = buildReport(base([ev("a-1")]));
  const meta = new Map(report.meta);
  assert.equal(meta.get("Supervision"), "Test Nigeria");
  assert.equal(meta.get("État"), "Active");
  assert.equal(meta.get("Pays"), "Nigeria");
  assert.equal(meta.get("Mots-clés"), "bandits");
  assert.equal(meta.get("Entités"), "aucun");
  assert.equal(meta.get("Exclusions"), "football");
  assert.match(meta.get("Période du rapport") ?? "", /30 derniers jours, du 11 oct\. 2026 au 10 nov\. 2026/);
  assert.match(meta.get("Généré le") ?? "", /10 novembre 2026 à 13:00 \(heure de Paris\)/);
  assert.match(meta.get("Données les plus récentes") ?? "", /10 nov\. 2026/);
});

test("la période filtre les événements : 7 jours ne garde que les plus récents", () => {
  const events = [ev("a-1", { at: "2026-11-09T10:00:00Z" }), ev("a-2", { at: "2026-10-20T10:00:00Z" })];
  const count = (period: 7 | 30 | 90) => {
    const synth = sectionOf(buildReport(base(events, { period })), "Synthèse")!.blocks[0];
    return synth.type === "table" ? synth.rows[0][1] : "";
  };
  assert.equal(count(7), "1");
  assert.equal(count(30), "2");
  assert.equal(count(90), "2");
});

test("alertes : critiques et importantes seulement, avec l'origine du classement et la décision enregistrée ; information jamais", () => {
  const events = [ev("a-1", { priority: "critique" }), ev("a-2", { priority: "importante" }), ev("a-3", { priority: "information" })];
  const report = buildReport(base(events, { decisions: new Map([["a-2", { status: "read", level: "importante" }]]) }));
  const entries = sectionOf(report, "Alertes")!.blocks.filter((b) => b.type === "entry");
  assert.equal(entries.length, 2);
  const text = JSON.stringify(entries);
  assert.match(text, /Origine du classement/);
  assert.match(text, /Décision enregistrée : lue/);
  assert.doesNotMatch(text, /Événement a-3/);
  const first = entries[0];
  assert.equal(first.type === "entry" ? first.tag?.text : "", "CRITIQUE");
});

test("les sources sont numérotées une seule fois par adresse et listées à la fin ; deux entrées au même lien partagent le numéro", () => {
  const events = [ev("a-1", { priority: "critique", url: "https://www.example.com/x?utm_source=z" }), ev("a-2", { priority: "importante", url: "https://example.com/x" }), ev("a-3", { priority: "importante", url: "https://other.org/y" })];
  const report = buildReport(base(events));
  assert.deepEqual(report.sources.map((s) => [s.n, s.host]), [[1, "example.com"], [2, "other.org"]]);
  const refs = sectionOf(report, "Alertes")!.blocks.flatMap((b) => (b.type === "entry" ? [b.refs] : []));
  assert.deepEqual(refs.sort(), [[1], [1], [2]].sort());
});

test("histoire regroupée : les reprises sont citées et comptées, sans jamais compter comme preuve", () => {
  const story = ev("p-1", {
    kind: "publication",
    publications: 3,
    story: { members: [{ id: "p-2", title: "Reprise", source: "Reuters", url: "https://reuters.com/a", at: "2026-11-08T12:00:00Z" }, { id: "p-3", title: "Reprise 2", source: "AFP", url: "https://afp.com/b", at: "2026-11-08T13:00:00Z" }] },
  });
  const report = buildReport(base([story]));
  const block = sectionOf(report, "Publications de presse")!.blocks.find((b) => b.type === "entry");
  assert.ok(block && block.type === "entry");
  if (block.type !== "entry") return;
  assert.match(block.lines.join(" "), /Même histoire reprise par 2 autres publications : Reuters, AFP/);
  assert.equal(block.refs.length, 3);
  assert.match(allText(report), /ce regroupement n'est pas une preuve indépendante/);
  assert.equal(report.sources.length, 3);
});

test("notes : absentes par défaut, incluses seulement sur demande, avec leur publication d'origine", () => {
  const note: Note = { id: "n1", eventRef: "a-1", eventTitle: "Titre de l'article", body: "À recouper avec une 2e source", revision: 2, createdAt: "2026-11-09T09:00:00Z", updatedAt: "2026-11-09T10:00:00Z" };
  assert.equal(sectionOf(buildReport(base([ev("a-1")])), "Notes"), undefined);
  assert.doesNotMatch(allText(buildReport(base([ev("a-1")]))), /À recouper/);
  const withNotes = sectionOf(buildReport(base([ev("a-1")], { notes: [note] })), "Notes")!;
  const entry = withNotes.blocks.find((b) => b.type === "entry");
  assert.ok(entry && entry.type === "entry");
  if (entry.type === "entry") {
    assert.equal(entry.title, "À recouper avec une 2e source");
    assert.match(entry.lines[0], /modifiée le .* · sur « Titre de l'article »/);
  }
  const empty = sectionOf(buildReport(base([], { notes: [] })), "Notes")!;
  assert.ok(empty.blocks.some((b) => b.type === "paragraph" && b.text === "Aucune note."));
});

test("limites : toujours présentes, honnêtes sur l'absence d'IA, la vérification, les seuils et la couverture ; attribution GeoNames seulement si un lieu en vient", () => {
  const plain = JSON.stringify(sectionOf(buildReport(base([ev("a-1")])), "Limites et méthode"));
  assert.match(plain, /aucune analyse générée par une intelligence artificielle/);
  assert.match(plain, /couverture des sources est partielle/);
  assert.match(plain, /seul « Confirmé »/);
  assert.match(plain, /importante à partir de 15 mentions et critique à partir de 20/);
  assert.match(plain, /45 %/);
  assert.doesNotMatch(plain, /GeoNames/);
  const geo = ev("p-1", { kind: "publication", lat: 12.17, lon: 6.25, geo: { source: "geonames", precision: "zone", name: "Zamfara State" } });
  assert.match(JSON.stringify(sectionOf(buildReport(base([geo])), "Limites et méthode")), /© GeoNames \(CC BY 4\.0\)/);
  const truncated = JSON.stringify(sectionOf(buildReport(base([ev("a-1")], { coverage: { articles: 1, signals: 0, publications: 0, merged: 4, grouped: 2, latest: null, truncated: true } })), "Limites et méthode"));
  assert.match(truncated, /lecture des données a été limitée/);
  assert.match(truncated, /4 entrée\(s\) citant la même publication et 2 publication\(s\)/);
});

test("plafonds : ce qui dépasse est annoncé, jamais passé sous silence", () => {
  const many = Array.from({ length: LIMITS.alerts + 5 }, (_, n) => ev(`a-${n}`, { priority: "importante", at: `2026-11-08T10:${String(n % 60).padStart(2, "0")}:00Z` }));
  const alerts = sectionOf(buildReport(base(many)), "Alertes")!;
  assert.equal(alerts.blocks.filter((b) => b.type === "entry").length, LIMITS.alerts);
  assert.ok(alerts.blocks.some((b) => b.type === "note" && /5 alerte\(s\) de plus/.test(b.text)));
});

test("sans événement : le rapport le dit sans conclure que rien ne se passe", () => {
  const report = buildReport(base([]));
  assert.match(allText(report), /Aucun événement retrouvé.*pas une preuve/);
  assert.match(allText(report), /Aucune alerte sur la période/);
});

test("en pause : les événements postérieurs à la pause ne produisent plus d'alerte dans le rapport", () => {
  const events = [ev("a-1", { priority: "critique", at: "2026-11-05T10:00:00Z" }), ev("a-2", { priority: "critique", at: "2026-11-09T10:00:00Z" })];
  const report = buildReport(base(events, { supervision: { name: "Test Nigeria", state: "paused" }, pausedAt: "2026-11-07T00:00:00Z" }));
  const titles = sectionOf(report, "Alertes")!.blocks.flatMap((b) => (b.type === "entry" ? [b.title] : []));
  assert.deepEqual(titles, ["Événement a-1"]);
});

test("nom de fichier sûr, sans accent ni caractère spécial, daté d'après l'heure de Paris", () => {
  assert.equal(reportFilename("Test Nord Bénin", NOW), "supervision-test-nord-benin-2026-11-10.pdf");
  assert.equal(reportFilename("  ///  ", NOW), "supervision-rapport-2026-11-10.pdf");
  assert.equal(reportFilename("Veille: Sahel/Mali — été", new Date("2026-11-10T23:30:00Z")), "supervision-veille-sahel-mali-ete-2026-11-11.pdf");
  assert.ok(reportFilename("x".repeat(300), NOW).length < 80);
});

test("période d'export : 7, 30 ou 90 seulement", () => {
  for (const value of [7, 30, 90]) assert.ok(isExportPeriod(value));
  for (const value of [0, 1, 14, 365, "30", null, NaN]) assert.equal(isExportPeriod(value), false);
});

// --- PDF ------------------------------------------------------------------------------------------------------------------

test("texte du PDF : accents français et guillemets conservés, caractères hors alphabet latin remplacés sans échec", async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  assert.equal(pdfText("Événement à Zamfara : « 48 morts » — l’État", font), "Événement à Zamfara : « 48 morts » — l’État");
  assert.equal(pdfText("Nigéria : ‑", font), "Nigéria : -");
  assert.equal(pdfText("Ünïcode ł ø", font).length, 11);
  assert.match(pdfText("日本語 and العربية", font), /^\?+ and \?+$/);
  assert.equal(pdfText("a\nb\tc​d", font), "a b cd");
  assert.equal(pdfText("😀", font), "?");
});

test("retour à la ligne : aucune ligne plus large que la place, une adresse très longue est coupée", async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const lines = wrap("un texte assez long pour tenir sur plusieurs lignes dans une colonne étroite de test", font, 10, 120);
  assert.ok(lines.length > 3);
  for (const line of lines) assert.ok(font.widthOfTextAtSize(line, 10) <= 120.01, line);
  const url = `https://example.com/${"a".repeat(300)}`;
  const cut = wrap(url, font, 8, 200);
  assert.ok(cut.length > 3);
  for (const line of cut) assert.ok(font.widthOfTextAtSize(line, 8) <= 200.01);
  assert.equal(cut.join(""), url, "rien n'est perdu à la coupe");
  assert.deepEqual(wrap("", font, 10, 100), [""]);
});

test("PDF : un fichier valide, des métadonnées justes, plusieurs pages quand il y a beaucoup de contenu, tous les caractères exotiques tolérés", async () => {
  const events = Array.from({ length: 60 }, (_, n) =>
    ev(`a-${n}`, { priority: n % 3 === 0 ? "critique" : n % 3 === 1 ? "importante" : "information", title: `Événement ${n} — attaque près de Zamfara « bilan » 日本語 😀 ${"très long titre ".repeat(n % 5)}`, summary: "Résumé de l'article. ".repeat(20), url: `https://example.com/${n}/${"x".repeat(120)}` }),
  );
  const report = buildReport(base(events, { notes: [{ id: "n", eventRef: null, eventTitle: null, body: "Note\nsur plusieurs\nlignes", revision: 1, createdAt: "2026-11-09T09:00:00Z", updatedAt: "2026-11-09T09:00:00Z" }] }));
  const bytes = await renderPdf(report, NOW);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const parsed = await PDFDocument.load(bytes);
  assert.ok(parsed.getPageCount() >= 4, `pages : ${parsed.getPageCount()}`);
  assert.equal(parsed.getTitle(), "Test Nigeria — Rapport de Supervision");
  assert.equal(parsed.getAuthor(), "Équinoxe News");
  assert.equal(parsed.getCreationDate()?.toISOString(), NOW.toISOString());
  assert.ok(bytes.byteLength < 400_000, `taille : ${bytes.byteLength}`);
});

test("PDF d'une Supervision sans aucun événement : une page lisible, sans erreur", async () => {
  const bytes = await renderPdf(buildReport(base([])), NOW);
  const parsed = await PDFDocument.load(bytes);
  assert.ok(parsed.getPageCount() >= 1);
});
