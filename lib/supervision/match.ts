import { foldName, inZone, type Place } from "./geo";
import type { Criteria, Zone } from "./model";

// Correspondance d'une publication avec une veille : mots-clés et entités dans le texte, exclusions, et zone. Module
// pur et déterministe (aucun appel IA) : la même publication donne toujours le même verdict, avec la raison écrite.

export interface Candidate extends Place {
  title: string;
  excerpt?: string | null;
}

export interface MatchResult {
  matched: boolean;
  score: number;
  /** Phrase lisible qui dit pourquoi l'élément est retenu (ou écarté). */
  reason: string;
  terms: string[];
  /** Vrai si l'élément est retenu sans lieu connu : il apparaît dans le flux mais pas sur la carte. */
  unlocated: boolean;
}

const ENTITY_WEIGHT = 3;
const KEYWORD_WEIGHT = 2;
/** Au-delà, d'autres occurrences d'un même terme n'ajoutent rien : le score mesure la variété, pas la répétition. */
const MAX_TERMS_COUNTED = 6;

/** Texte prêt à comparer : minuscules, sans accents ni ponctuation, entouré d'espaces pour les mots entiers. */
function haystack(candidate: Candidate): string {
  return ` ${foldName(`${candidate.title} ${candidate.excerpt ?? ""}`)} `;
}

function contains(text: string, term: string): boolean {
  const folded = foldName(term);
  return folded.length > 0 && text.includes(` ${folded} `);
}

export function matchCandidate(candidate: Candidate, zone: Zone, criteria: Criteria, names?: Set<string>): MatchResult {
  const text = haystack(candidate);

  const excluded = criteria.exclusions.find((term) => contains(text, term));
  if (excluded) return { matched: false, score: 0, reason: `Exclu : « ${excluded} »`, terms: [], unlocated: false };

  const entityHits = criteria.entities.filter((term) => contains(text, term));
  const keywordHits = criteria.keywords.filter((term) => contains(text, term));
  const terms = [...entityHits, ...keywordHits].slice(0, MAX_TERMS_COUNTED);
  const score = Math.min(entityHits.length, MAX_TERMS_COUNTED) * ENTITY_WEIGHT + Math.min(keywordHits.length, MAX_TERMS_COUNTED) * KEYWORD_WEIGHT;
  const needsTerms = criteria.entities.length + criteria.keywords.length > 0;

  const place = inZone(zone, candidate, names);
  const located = candidate.latitude != null && candidate.longitude != null;
  const insideReason = place.inside ? (place.distanceKm !== null ? `dans la zone (à ${place.distanceKm} km du centre)` : "dans la zone") : null;

  // Un lieu connu hors de la zone écarte l'élément, même s'il cite un mot-clé : c'est un autre endroit du monde.
  if (located && !place.inside) return { matched: false, score: 0, reason: "Hors de la zone", terms, unlocated: false };

  if (needsTerms) {
    if (terms.length === 0) return { matched: false, score: 0, reason: "Aucun mot-clé ni entité", terms: [], unlocated: false };
    const why = `Cite : ${terms.map((term) => `« ${term} »`).join(", ")}`;
    return { matched: true, score, reason: insideReason ? `${why} · ${insideReason}` : why, terms, unlocated: !located };
  }

  // Veille par thèmes et zone seulement : il faut un lieu connu dans la zone.
  if (place.inside) return { matched: true, score: 1, reason: insideReason ?? "Dans la zone", terms: [], unlocated: false };
  return { matched: false, score: 0, reason: "Lieu inconnu", terms: [], unlocated: true };
}
