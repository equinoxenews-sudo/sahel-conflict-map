import assert from "node:assert/strict";
import test from "node:test";
import { candidateKeys, candidatesIn, locate, nameKey, parseGeonamesLine, type PlaceRow } from "../lib/supervision/geo/gazetteer";

/** Ligne au format GeoNames (19 colonnes séparées par des tabulations). */
function line(id: number, name: string, lat: number, lon: number, cls: string, code: string, population = 0, alternates = "", country = "ML"): string {
  return [id, name, name, alternates, lat, lon, cls, code, country, "", "04", "", "", "", population, "", "", "Africa/Bamako", "2020-01-01"].join("\t");
}

const FILE = [
  line(1, "Baïma", 14.5353, -3.9619, "P", "PPL"),
  line(2, "Anefis", 18.64139, -1.93556, "H", "WLL"), // un PUITS : ne doit jamais devenir un lieu
  line(3, "Mopti", 14.4843, -4.18296, "P", "PPLA", 186187, "Mopti,Sévaré-Mopti"),
  line(4, "Kidal", 18.44345, 1.40921, "P", "PPLA", 40030),
  line(5, "Kidal", 18.44389, 1.3354, "A", "ADM2"),
  line(6, "Région de Gao", 16.27, -0.04, "A", "ADM1"),
  line(7, "Gao", 16.2717, -0.0447, "P", "PPLA", 86633),
  line(8, "Koro", 14.07, -3.08, "P", "PPL", 500),
  line(9, "Koro", 12.0, -8.0, "P", "PPL", 50000),
  line(10, "Dene", 13.0, -5.0, "P", "PPL"),
  line(11, "Dene", 16.0, -1.0, "P", "PPL"),
  line(12, "Selon", 12.5, -7.5, "P", "PPL"), // un village qui s'appelle comme un mot de phrase
  line(13, "Bad", 12.5, -7.5, "P", "PPL"), // trop court
  line(14, "Lac Faguibine", 16.7, -3.9, "H", "LK"), // un lac
  line(15, "Tombouctou", 16.7735, -3.0074, "P", "PPLA", 54453, "Timbuktu,Tombouctou,Tombouctou 2"),
  line(16, "Mali", 17.0, -4.0, "A", "PCLI"), // un pays : exclu (ni localité ni ADM1-3)
];
const rows: PlaceRow[] = FILE.flatMap(parseGeonamesLine);
const rowsFor = (...texts: string[]) => {
  const keys = new Set(candidateKeys(texts));
  return rows.filter((row) => keys.has(row.name_key));
};
const where = (title: string, excerpt: string | null = null) => locate(title, excerpt, rowsFor(title, excerpt ?? ""));

test("lecture GeoNames : localités et régions ADM1-3 seulement, noms alternatifs gardés, noms trop courts ou chiffrés écartés", () => {
  const classes = new Map(rows.map((row) => [row.geoname_id, row.feature_code]));
  assert.ok(classes.has(1) && classes.has(3) && classes.has(5) && classes.has(6));
  for (const excluded of [2, 14, 16, 13]) assert.equal(classes.has(excluded), false, `lieu ${excluded} exclu`);
  const mopti = rows.filter((row) => row.geoname_id === 3).map((row) => row.name_key).sort();
  assert.deepEqual(mopti, ["mopti", "sevare mopti"]);
  assert.ok(rows.some((row) => row.name_key === "timbuktu"));
  assert.equal(rows.some((row) => row.name_key.includes("2")), false, "« Tombouctou 2 » (chiffre) écarté");
  assert.deepEqual(parseGeonamesLine("ligne tronquée"), []);
  assert.deepEqual(parseGeonamesLine(line(99, "Zzz", 1, 1, "P", "PPL")), [], "moins de 4 caractères");
});

test("candidats : seulement des mots en majuscule, avec mots de liaison au milieu, sans accents ni casse dans la clé", () => {
  assert.deepEqual(candidateKeys(["attaque à baïma"]), []);
  assert.ok(candidateKeys(["Attaque du JNIM à Baïma, région de Mopti"]).includes("baima"));
  assert.ok(candidateKeys(["Ségou de l'Est"]).includes("segou de l est") || candidateKeys(["Ségou de l'Est"]).includes("segou"));
  assert.ok(candidatesIn("Béni Abbès est une ville").some((c) => c.key === "beni abbes" && c.words === 2));
  assert.equal(nameKey("Sévaré-Mopti"), "sevare mopti");
});

test("ton exemple : « Baïma, région de Mopti » est localisé à Baïma (la localité citée), pas à Mopti", () => {
  const found = where("Attaque du JNIM contre un campement militaire à Baïma, région de Mopti");
  assert.equal(found?.name, "Baïma");
  assert.equal(found?.precision, "ville");
  assert.deepEqual([found?.latitude, found?.longitude], [14.5353, -3.9619]);
  assert.equal(where("Attaque du JNIM contre un campement militaire à Baima")?.name, "Baïma", "sans le tréma, même lieu");
});

test("le puits « Anefis » n'est pas une ville : pas de position plutôt qu'une position à 600 km", () => {
  assert.equal(where("Frappe de drone kamikaze à Anefis, région de Kidal")?.name, "Kidal", "la seule localité reconnue du texte est Kidal");
  assert.equal(where("Frappe de drone kamikaze à Anefis"), null);
});

test("une localité l'emporte sur une région de même nom ; une région seule donne une précision « zone »", () => {
  const city = where("Combats à Kidal");
  assert.equal(city?.precision, "ville");
  assert.deepEqual([city?.latitude, city?.longitude], [18.44345, 1.40921]);
  const zone = where("Offensive dans la Région de Gao");
  assert.equal(zone?.precision === "ville" || zone?.precision === "zone", true);
  const onlyRegion = locate("Région de Gao", null, rows.filter((row) => row.geoname_id === 6));
  assert.equal(onlyRegion?.precision, "zone");
});

test("le premier lieu cité l'emporte (le titre avant le résumé), une localité avant une région", () => {
  assert.equal(where("Attaque à Gao", "Selon des sources, des combats ont aussi eu lieu à Mopti.")?.name, "Gao");
  assert.equal(where("Situation tendue", "Des affrontements à Mopti puis à Gao.")?.name, "Mopti");
});

test("noms ambigus : le plus peuplé s'il domine nettement, un lieu si les homonymes sont voisins, sinon aucun lieu", () => {
  assert.equal(where("Attaque à Koro")?.latitude, 12.0, "50 000 habitants contre 500 : le gros domine");
  assert.equal(where("Attaque à Dene"), null, "deux villages sans population, à 400 km l'un de l'autre : on ne devine pas");
  const near: PlaceRow[] = [
    { geoname_id: 20, name_key: "yoro", name: "Yoro", country: "ML", latitude: 10, longitude: -5, feature_code: "PPL", population: 0, is_main: true },
    { geoname_id: 21, name_key: "yoro", name: "Yoro", country: "ML", latitude: 10.1, longitude: -5.05, feature_code: "PPL", population: 0, is_main: true },
  ];
  assert.ok(locate("Attaque à Yoro", null, near), "homonymes voisins (moins de 40 km) : un seul lieu plausible");
});

test("faux amis : un mot de début de phrase n'est pas un village, un mot en minuscule non plus", () => {
  assert.equal(where("Selon des sources locales, la situation est calme"), null, "« Selon » existe comme village mais ouvre la phrase");
  assert.equal(where("La situation reste calme à baïma"), null, "un nom de lieu s'écrit avec une majuscule");
  assert.equal(where("Aucun lieu cité ici"), null);
  assert.equal(where("Frappe contre le Mali", null), null, "un pays n'est pas un lieu précis");
});

test("noms alternatifs : « Timbuktu » localise Tombouctou", () => {
  assert.equal(where("Attack near Timbuktu")?.name, "Tombouctou");
});

test("aucune ligne de la base, ou texte vide : aucune position", () => {
  assert.equal(locate("Attaque à Baïma", null, []), null);
  assert.equal(locate("", null, rows), null);
});
