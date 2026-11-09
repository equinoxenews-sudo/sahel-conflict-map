// Supervision V1, Lot 4b : localisation d'une publication d'après les noms de lieux de son texte, SANS IA, avec le dictionnaire
// GeoNames. Module PUR et testé : aucun réseau, aucune base (la lecture des lieux candidats est faite par l'appelant).
//
// Principes (mieux vaut ne pas localiser que mal localiser) :
//  - seuls les lieux du PAYS de la Supervision sont cherchés ; seules les localités et les régions administratives comptent
//    (un « puits » ou un « cours d'eau » de même nom ferait tomber l'événement à des centaines de kilomètres) ;
//  - un nom de lieu s'écrit avec une majuscule : « le bon » ou « source » ne sont jamais pris pour des villages ;
//  - un mot en début de phrase n'est retenu que s'il désigne un lieu important (sinon « Selon », « Dans »… passeraient pour des villages) ;
//  - plusieurs lieux de même nom : on choisit le plus peuplé seulement s'il domine nettement ; sinon on ne localise pas ;
//  - plusieurs lieux cités dans un texte : le premier cité l'emporte, une localité avant une région (« à Baïma, région de Mopti »).
// Données géographiques © GeoNames, licence CC BY 4.0 (mention obligatoire à l'affichage).

import { fold } from "../collect/terms";

export interface PlaceRow {
  geoname_id: number;
  name_key: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  feature_code: string;
  population: number;
  is_main: boolean;
}

export interface Located {
  name: string;
  latitude: number;
  longitude: number;
  precision: "ville" | "zone";
  geonameId: number;
}

export const GEO_SOURCE = "geonames";
export const GEONAMES_ATTRIBUTION = "Données géographiques © GeoNames (CC BY 4.0)";

// --- Lecture du fichier GeoNames --------------------------------------------------------------------------------------------

const ADMIN_CODES = new Set(["ADM1", "ADM2", "ADM3"]);
/** Un nom de 3 lettres (« Gao », « Kita ») n'est gardé que pour un lieu important. */
const MIN_KEY_LENGTH = 4;
const MIN_SHORT_KEY_LENGTH = 3;
const SHORT_NAME_MIN_POPULATION = 5000;
const MAX_NAME_LENGTH = 60;

export function nameKey(name: string): string {
  return fold(name).trim();
}

function usableName(name: string, important: boolean): boolean {
  if (name.length > MAX_NAME_LENGTH || /[0-9]/.test(name)) return false;
  const length = nameKey(name).length;
  return length >= MIN_KEY_LENGTH || (important && length >= MIN_SHORT_KEY_LENGTH);
}

/**
 * Une ligne d'un fichier GeoNames par pays (tabulations) → une ligne par variante de nom. Colonnes : 0 identifiant, 1 nom, 2 nom ASCII,
 * 3 noms alternatifs (séparés par des virgules), 4 latitude, 5 longitude, 6 classe, 7 code, 8 pays, 14 population.
 */
export function parseGeonamesLine(line: string): PlaceRow[] {
  const cols = line.split("\t");
  if (cols.length < 15) return [];
  const [id, name, , alternates, lat, lon, featureClass, featureCode, country] = cols;
  const isPlace = featureClass === "P";
  const isAdmin = featureClass === "A" && ADMIN_CODES.has(featureCode);
  if (!isPlace && !isAdmin) return [];
  const latitude = Number(lat);
  const longitude = Number(lon);
  const geonameId = Number(id);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(geonameId) || !country) return [];
  const population = Number.parseInt(cols[14] ?? "0", 10) || 0;
  const important = /^PPL[AC]/.test(featureCode) || population >= SHORT_NAME_MIN_POPULATION;
  const out = new Map<string, PlaceRow>();
  const add = (label: string, isMain: boolean) => {
    if (!usableName(label, important)) return;
    const key = nameKey(label);
    if (!out.has(key)) out.set(key, { geoname_id: geonameId, name_key: key, name, country, latitude, longitude, feature_code: featureCode, population, is_main: isMain });
  };
  add(name, true);
  for (const alternate of alternates ? alternates.split(",") : []) add(alternate.trim(), false);
  return [...out.values()];
}

// --- Candidats dans un texte ------------------------------------------------------------------------------------------------

const CONNECTORS = new Set(["de", "du", "des", "la", "le", "el", "al", "en", "sur", "ben", "ould", "wa"]);
const MAX_WORDS = 3;

interface Token {
  text: string;
  start: number;
  capitalized: boolean;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/[\p{L}][\p{L}'’-]*/gu)) {
    const word = match[0];
    tokens.push({ text: word, start: match.index ?? 0, capitalized: /^\p{Lu}/u.test(word) });
  }
  return tokens;
}

function startsSentence(text: string, start: number): boolean {
  const before = text.slice(0, start).trimEnd();
  return before.length === 0 || /[.!?:;«"“—–-]$/.test(before);
}

export interface Candidate {
  key: string;
  /** Position dans le texte (ordre d'apparition). */
  start: number;
  words: number;
  sentenceStart: boolean;
}

/** Suites de 1 à 3 mots commençant par une majuscule (des mots de liaison sont admis au milieu : « Béni Abbès », « Ségou de l'Est »). */
export function candidatesIn(text: string): Candidate[] {
  const tokens = tokenize(text);
  const out: Candidate[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!tokens[i].capitalized) continue;
    for (let n = 1; n <= MAX_WORDS && i + n <= tokens.length; n++) {
      const span = tokens.slice(i, i + n);
      const last = span[span.length - 1];
      // Le mot ajouté doit être en majuscule ou un mot de liaison, sinon la suite s'arrête ; une suite ne se termine pas par un mot de liaison.
      if (n > 1 && !last.capitalized && !CONNECTORS.has(last.text.toLowerCase())) break;
      if (!last.capitalized) continue;
      const key = nameKey(span.map((token) => token.text).join(" "));
      if (key.length >= MIN_SHORT_KEY_LENGTH) out.push({ key, start: tokens[i].start, words: n, sentenceStart: startsSentence(text, tokens[i].start) });
    }
  }
  return out;
}

/** Toutes les clés à demander à la base pour un ensemble de textes (sans doublon). */
export function candidateKeys(texts: readonly string[]): string[] {
  return [...new Set(texts.flatMap((text) => candidatesIn(text).map((candidate) => candidate.key)))];
}

// --- Choix du lieu ----------------------------------------------------------------------------------------------------------

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const NEAR_KM = 40;
const DOMINANCE = 10;
/** Un mot en début de phrase n'est accepté que pour un lieu de cette taille au moins (« Selon », « Dans » ne sont pas des villages). */
const SENTENCE_START_MIN_POPULATION = 5000;

const isPlace = (row: PlaceRow) => !ADMIN_CODES.has(row.feature_code);

/** Parmi des lieux de même nom : le plus peuplé s'il domine, un lieu s'ils sont voisins, sinon aucun (ambigu). */
function resolve(rows: readonly PlaceRow[]): PlaceRow | null {
  const byId = new Map<number, PlaceRow>();
  for (const row of rows) if (!byId.has(row.geoname_id)) byId.set(row.geoname_id, row);
  const distinct = [...byId.values()].sort((a, b) => Number(isPlace(b)) - Number(isPlace(a)) || b.population - a.population);
  if (distinct.length === 0) return null;
  const places = distinct.filter(isPlace);
  const pool = places.length > 0 ? places : distinct; // une localité l'emporte sur une région de même nom
  const [top, second] = pool;
  if (!second) return top;
  if (pool.every((row) => distanceKm(top, row) <= NEAR_KM)) return top;
  if (top.population > 0 && top.population >= second.population * DOMINANCE) return top;
  return null;
}

/**
 * Lieu d'un texte (titre puis résumé), ou null. `rows` : les lieux de la base dont la clé figure parmi les candidats du texte, de
 * UN SEUL pays ou de plusieurs pays de la zone.
 */
export function locate(title: string, excerpt: string | null, rows: readonly PlaceRow[]): Located | null {
  const byKey = new Map<string, PlaceRow[]>();
  for (const row of rows) {
    const list = byKey.get(row.name_key);
    if (list) list.push(row);
    else byKey.set(row.name_key, [row]);
  }
  if (byKey.size === 0) return null;

  type Found = { row: PlaceRow; rank: number; order: number };
  const found: Found[] = [];
  const parts = [title, excerpt ?? ""];
  let offset = 0;
  for (const part of parts) {
    const taken: { from: number; to: number }[] = [];
    // Les suites les plus longues d'abord : « Béni Abbès » avant « Béni ».
    const candidates = candidatesIn(part).sort((a, b) => b.words - a.words || a.start - b.start);
    for (const candidate of candidates) {
      const length = candidate.key.length;
      if (taken.some((range) => candidate.start >= range.from && candidate.start < range.to)) continue;
      const matches = byKey.get(candidate.key);
      if (!matches) continue;
      const row = resolve(matches);
      if (!row) continue;
      if (candidate.sentenceStart && candidate.words === 1 && row.population < SENTENCE_START_MIN_POPULATION) continue;
      taken.push({ from: candidate.start, to: candidate.start + length });
      found.push({ row, rank: isPlace(row) ? 0 : 1, order: offset + candidate.start });
    }
    offset += part.length + 1000; // le titre passe avant le résumé
  }
  if (found.length === 0) return null;
  found.sort((a, b) => a.rank - b.rank || a.order - b.order);
  const best = found[0].row;
  return { name: best.name, latitude: best.latitude, longitude: best.longitude, precision: isPlace(best) ? "ville" : "zone", geonameId: best.geoname_id };
}
