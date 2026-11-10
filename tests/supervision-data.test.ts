import assert from "node:assert/strict";
import test from "node:test";
import { extractArea, fitProjection, ringsToPath } from "../lib/supervision/dashboard/geo";
import { SIGNAL_CRITICAL_MENTIONS, SIGNAL_IMPORTANT_MENTIONS, briefToEvent, eventToEvent, matchCountry, matchToEvent, priorityOfBrief, priorityOfEvent, qualifierOfBrief, themeOfBrief, verificationOfBrief, type BriefRow, type EventRow } from "../lib/supervision/data/mapping";

const brief: BriefRow = {
  id: 1908,
  zone_slug: "afrique",
  title: "Nigeria : attaque contre un convoi",
  summary: "Résumé.",
  source_urls: ["https://exemple.org/a"],
  source_domains: ["exemple.org"],
  published_at: "2026-11-09T11:10:23.897665+00:00",
  countries: ["NGA"],
  primary_theme: "conflicts",
  event_type: "armed_clash",
  importance: "high",
  veracity: "Très probable",
  source_count: 3,
  place_name: "Maiduguri",
  place_country: "Nigeria",
  latitude: 11.8,
  longitude: 13.15,
};

const signal: EventRow = { id: 16578, event_date: "2026-11-09", country: "Nigeria", latitude: 9.1, longitude: 7.4, category: "Battles", source: "https://www.radiotamazuj.org/en/news/x", num_mentions: 25, summary: null };

test("thème : le thème principal l'emporte, puis le type d'événement, puis un repli neutre", () => {
  assert.equal(themeOfBrief("conflicts", null), "conflits");
  assert.equal(themeOfBrief("humanitarian_health", null), "humanitaire");
  assert.equal(themeOfBrief("diplomacy", "armed_clash"), "politique");
  assert.equal(themeOfBrief(null, "airstrike"), "conflits");
  assert.equal(themeOfBrief("inconnu", null), "politique");
});

test("priorité : « critique » seulement pour une importance haute ET un événement violent", () => {
  assert.equal(priorityOfBrief("high", "airstrike"), "critique");
  assert.equal(priorityOfBrief("high", "election"), "importante");
  assert.equal(priorityOfBrief("high", null), "importante");
  assert.equal(priorityOfBrief("medium", "airstrike"), "information");
  assert.equal(priorityOfBrief(null, null), "information");
});

test("vérification (D4) : seul « Confirmé » est confirmé ; tout le reste est un signalement, jamais « corroboré » ni « contesté »", () => {
  assert.equal(verificationOfBrief("Confirmé"), "confirme");
  for (const value of ["Très probable", "Peu probable", "Revendiqué", "Possible", "Non confirmé", null, "autre"]) assert.equal(verificationOfBrief(value), "signalement", String(value));
  // Le qualificatif de l'analyse est affiché tel quel à côté du statut.
  assert.equal(qualifierOfBrief("Très probable"), "jugé très probable par l'analyse");
  assert.equal(qualifierOfBrief("Peu probable"), "jugé peu probable par l'analyse");
  assert.match(qualifierOfBrief("Confirmé") ?? "", /^confirmé par l'analyse/);
  assert.match(qualifierOfBrief("Revendiqué") ?? "", /sans confirmation indépendante/);
  assert.equal(qualifierOfBrief(null), undefined);
  assert.equal(qualifierOfBrief("autre"), undefined);
  // Même avec 500 mentions, un signalement médiatique n'est jamais « confirmé » (le nombre de publications n'est pas un indice de véracité).
  assert.equal(eventToEvent({ ...signal, num_mentions: 500 }).verification, "signalement");
});

test("priorité d'un signalement : violent et très repris seulement", () => {
  assert.deepEqual([SIGNAL_IMPORTANT_MENTIONS, SIGNAL_CRITICAL_MENTIONS], [15, 20], "seuils décidés le 10/11/2026 (option A)");
  assert.equal(priorityOfEvent("Battles", 25), "critique");
  assert.equal(priorityOfEvent("Battles", 20), "critique");
  assert.equal(priorityOfEvent("Battles", 19), "importante");
  assert.equal(priorityOfEvent("Battles", 15), "importante");
  assert.equal(priorityOfEvent("Battles", 14), "information");
  assert.equal(priorityOfEvent("Violence against civilians", 10), "information", "le palier à 10 mentions, très fréquent, ne déclenche rien");
  assert.equal(priorityOfEvent("Battles", 6), "information");
  assert.equal(priorityOfEvent("Protests", 80), "information");
  assert.equal(priorityOfEvent("Battles", null), "information");
});

test("article → événement : identifiant, source, coordonnées et publications conservés ; lieu absent = dit tel quel", () => {
  const e = briefToEvent(brief);
  assert.equal(e.id, "a-1908");
  assert.equal(e.kind, "article");
  assert.equal(e.url, "https://exemple.org/a");
  assert.deepEqual([e.lat, e.lon], [11.8, 13.15]);
  assert.equal(e.publications, 3);
  assert.equal(e.at, "2026-11-09T11:10:23.897Z");
  const bare = briefToEvent({ ...brief, place_name: null, place_country: null, latitude: null, longitude: null, source_urls: null, source_count: null });
  assert.equal(bare.place, "Lieu non précisé");
  assert.equal(bare.lat, undefined);
  assert.equal(bare.publications, 1);
});

test("coordonnées absurdes : ignorées, l'événement reste (il ira dans le flux, pas sur la carte)", () => {
  assert.equal(briefToEvent({ ...brief, latitude: 999, longitude: 13 }).lat, undefined);
  assert.equal(eventToEvent({ ...signal, latitude: Number.NaN }).lat, undefined);
});

test("signalement → événement : titre qui dit ce que c'est, domaine de la source, date au jour", () => {
  const e = eventToEvent(signal);
  assert.equal(e.id, "e-16578");
  assert.equal(e.kind, "signal");
  assert.equal(e.title, "Signalement médiatique : affrontements (Nigeria) · radiotamazuj.org");
  assert.equal(eventToEvent({ ...signal, source: null }).title, "Signalement médiatique : affrontements (Nigeria)");
  assert.deepEqual(e.domains, ["radiotamazuj.org"]);
  assert.equal(e.priority, "critique");
  assert.equal(e.at, "2026-11-09T12:00:00.000Z");
  assert.deepEqual(eventToEvent({ ...signal, source: "pas une adresse" }).domains, []);
  assert.equal(eventToEvent({ ...signal, category: "Autre chose" }).theme, "securite");
});

test("pays : nom français, libellés sans accents et libellés combinés des signalements", () => {
  const nga = matchCountry("NGA");
  assert.ok(nga);
  assert.equal(nga.name, "Nigeria");
  assert.ok(nga.eventNames.includes("Nigeria"));
  const bra = matchCountry("BRA");
  assert.ok(bra?.eventNames.includes("Bresil"), "libellé sans accent utilisé par conflict_events");
  const pse = matchCountry("PSE");
  assert.ok(pse?.eventNames.includes("Israel / Palestine"));
  assert.equal(matchCountry("XXX"), null);
});

const geojson = {
  features: [
    { id: "AAA", geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5], [0, 0]]] } },
    { id: "BBB", geometry: { type: "MultiPolygon", coordinates: [[[[20, 10], [30, 10], [30, 20], [20, 20], [20, 10]]], [[[40, 10], [45, 10], [45, 15], [40, 10]]]] } },
    { id: "CCC", geometry: null },
  ],
};

test("contour : un ou plusieurs pays, cadre calculé, pays inconnu = aucun fond", () => {
  const one = extractArea(geojson, ["AAA"]);
  assert.deepEqual(one?.bbox, [0, 0, 10, 5]);
  const multi = extractArea(geojson, ["BBB"]);
  assert.equal(multi?.rings.length, 2);
  assert.deepEqual(multi?.bbox, [20, 10, 45, 20]);
  const both = extractArea(geojson, ["AAA", "BBB"]);
  assert.deepEqual(both?.bbox, [0, 0, 45, 20]);
  assert.equal(extractArea(geojson, ["CCC"]), null);
  assert.equal(extractArea(geojson, ["ZZZ"]), null);
});

test("contour : un anneau très détaillé est allégé sans perdre sa fermeture", () => {
  const ring = Array.from({ length: 2000 }, (_, i) => [Math.cos(i / 318) * 10, Math.sin(i / 318) * 10] as [number, number]);
  ring.push(ring[0]);
  const area = extractArea({ features: [{ id: "BIG", geometry: { type: "Polygon", coordinates: [ring] } }] }, ["BIG"]);
  assert.ok(area && area.rings[0].length <= 230);
  assert.deepEqual(area.rings[0][area.rings[0].length - 1], ring[ring.length - 1]);
});

test("projection : le nord est en haut, l'est à droite, les proportions suivent la latitude, hors cadre détecté", () => {
  const area = extractArea(geojson, ["AAA"])!;
  const p = fitProjection(area);
  const nw = p.project(0, 5);
  const se = p.project(10, 0);
  assert.ok(nw.y < se.y, "le nord est plus haut que le sud");
  assert.ok(nw.x < se.x, "l'ouest est à gauche de l'est");
  assert.ok(p.height >= 40 && p.height <= 220);
  assert.ok(p.inside(5, 2.5));
  assert.equal(p.inside(60, 2.5), false);
  assert.equal(p.inside(5, 40), false);
  // Près des pôles, un degré de longitude est plus court : le cadre est plus étroit pour la même étendue en degrés.
  const polar = fitProjection({ rings: [], bbox: [0, 60, 10, 65] });
  const equator = fitProjection({ rings: [], bbox: [0, 0, 10, 5] });
  assert.ok(polar.height > equator.height);
});

test("chemin SVG : un sous-chemin fermé par anneau", () => {
  const area = extractArea(geojson, ["BBB"])!;
  const path = ringsToPath(area.rings, fitProjection(area));
  assert.equal((path.match(/M/g) ?? []).length, 2);
  assert.equal((path.match(/Z/g) ?? []).length, 2);
});

test("publication collectée → événement : sans priorité ni vérification inventées, raison et source conservées, thème inconnu replié", () => {
  const row = { theme: "conflits", reason: "Cite « Nigeria » et : « attaque »", terms: ["attaque"], sv_items: { id: "i1", url: "https://www.journal.test/a?x=1", title: "Titre", excerpt: "Extrait", source_name: "Journal Test", published_at: "2026-11-09T08:00:00Z" } };
  const event = matchToEvent(row, "Nigeria");
  assert.ok(event);
  assert.equal(event.id, "p-i1");
  assert.equal(event.kind, "publication");
  assert.equal(event.priority, "information");
  assert.equal(event.verification, "signalement");
  assert.equal(event.reason, row.reason);
  assert.deepEqual(event.domains, ["Journal Test", "journal.test"]);
  assert.equal(event.place, "Nigeria");
  assert.equal(matchToEvent({ ...row, theme: "inconnu" }, "Nigeria")?.theme, "securite");
  assert.equal(matchToEvent({ ...row, sv_items: null }, "Nigeria"), null);
  assert.equal(matchToEvent({ ...row, sv_items: { ...row.sv_items, published_at: null } }, "Nigeria"), null, "sans date, pas de place dans une chronologie");
});
