// Supervision V1, Lot 4 : correspondance d'une publication avec une Supervision. Module PUR et DÉTERMINISTE (aucun appel IA) :
// la même publication donne toujours le même verdict, avec la raison écrite en français.
//
// Règles :
//  1. une publication doit CITER un pays de la zone (sinon la recherche l'a ramenée par erreur : « ne cite aucun pays ») ;
//  2. si l'utilisateur a choisi des mots-clés ou des entités, il faut en citer au moins un ; sinon il faut citer un terme de l'objectif ;
//  3. un terme d'exclusion écarte la publication, quoi qu'elle cite d'autre.

import type { ScopeSnapshot } from "../core/majorChange";
import { OBJECTIVE_TERMS, THEME_OF_OBJECTIVE, containsTerm, fold, themeOfText, type ThemeKey } from "./terms";
import { countryNames } from "./queries";

export interface MatchInput {
  title: string;
  excerpt: string | null;
}

export interface MatchResult {
  matched: boolean;
  score: number;
  reason: string;
  terms: string[];
  theme: ThemeKey;
}

const ENTITY_WEIGHT = 3;
const KEYWORD_WEIGHT = 2;
const OBJECTIVE_WEIGHT = 1;
const MAX_TERMS_COUNTED = 6;

/** Mots des pays de la zone, dans les deux langues. */
export function zoneCountryWords(snapshot: ScopeSnapshot): string[] {
  const zone = snapshot.scope.primaryZone;
  if (zone.kind !== "countries") return [];
  return [...new Set(zone.codes.flatMap((code) => countryNames(code)?.names ?? []))];
}

export function matchItem(item: MatchInput, snapshot: ScopeSnapshot, exclusions: readonly string[] = []): MatchResult {
  const text = fold(`${item.title} ${item.excerpt ?? ""}`);
  const fallback = THEME_OF_OBJECTIVE[snapshot.scope.objective] ?? "securite";
  const reject = (reason: string, terms: string[] = []): MatchResult => ({ matched: false, score: 0, reason, terms, theme: fallback });

  const excluded = exclusions.find((term) => containsTerm(text, term));
  if (excluded) return reject(`Exclu : « ${excluded} »`);

  const place = zoneCountryWords(snapshot).find((word) => containsTerm(text, word));
  if (!place) return reject("Ne cite aucun pays de la zone");

  const entityHits = snapshot.scope.entities.filter((term) => containsTerm(text, term));
  const keywordHits = snapshot.scope.keywords.filter((term) => containsTerm(text, term));
  const userTerms = snapshot.scope.entities.length + snapshot.scope.keywords.length > 0;
  const objectiveHits = [...(OBJECTIVE_TERMS[snapshot.scope.objective]?.fr ?? []), ...(OBJECTIVE_TERMS[snapshot.scope.objective]?.en ?? [])].filter((term) => containsTerm(text, term));

  const terms = userTerms ? [...entityHits, ...keywordHits] : objectiveHits;
  if (terms.length === 0) return reject(userTerms ? "Aucun mot-clé ni entité de la Supervision" : "Aucun terme de l'objectif");

  const counted = terms.slice(0, MAX_TERMS_COUNTED);
  const score = userTerms
    ? Math.min(entityHits.length, MAX_TERMS_COUNTED) * ENTITY_WEIGHT + Math.min(keywordHits.length, MAX_TERMS_COUNTED) * KEYWORD_WEIGHT
    : Math.min(objectiveHits.length, MAX_TERMS_COUNTED) * OBJECTIVE_WEIGHT;
  return {
    matched: true,
    score,
    reason: `Cite « ${place} » et : ${counted.map((term) => `« ${term} »`).join(", ")}`,
    terms: counted,
    theme: themeOfText(item.title, item.excerpt, fallback),
  };
}
