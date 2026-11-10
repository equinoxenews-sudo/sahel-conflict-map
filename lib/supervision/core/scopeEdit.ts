import { COUNTRY_CODES } from "../../countryCodes";
import type { ScopeSnapshot } from "./majorChange";
import { OBJECTIVES } from "./scope";

// Supervision V1, Lot 5 : modification du périmètre par l'utilisateur (pays, objectif, mots-clés, entités, exclusions).
// Module PUR et testé : il valide et normalise ce que le navigateur envoie, sans rien supposer. Le serveur reste maître de la décision
// « changement majeur ou non » (majorChange.ts) et de l'enregistrement versionné (store.ts).
//
// Ce que fait chaque liste dans la collecte (voir collect/match.ts) :
//  - mots-clés (poids 2) et entités (poids 3, lieux ou groupes) : dès qu'il y en a, SEULS eux comptent — les termes génériques de
//    l'objectif ne suffisent plus, et la règle « il faut un fait » ne s'applique plus ;
//  - exclusions : une publication qui en contient une est écartée, quoi qu'elle cite d'autre.

export const TERM_MIN = 2;
export const TERM_MAX = 60;
export const TERMS_MAX = 20;
export const COUNTRIES_MAX = 5;

export interface ScopeEdit {
  /** Codes ISO 3 des pays de la zone (au moins un). */
  countries: string[];
  objective: string;
  keywords: string[];
  entities: string[];
  exclusions: string[];
}

export type ScopeEditValidation = { ok: true; value: ScopeEdit } | { ok: false; errors: string[] };

/** Forme comparable d'un terme : minuscules, sans accents, espaces simples (sert à repérer les doublons, pas à l'affichage). */
const comparable = (term: string) => term.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr-FR").replace(/\s+/g, " ").trim();

function cleanTerms(raw: unknown, label: string, errors: string[]): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    errors.push(`${label} : une liste est attendue.`);
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      errors.push(`${label} : chaque élément doit être un texte.`);
      continue;
    }
    // Caractères de contrôle retirés, espaces regroupés : un terme est une ligne de texte simple.
    const term = entry.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    if (term.length === 0) continue;
    if (term.length < TERM_MIN || term.length > TERM_MAX) {
      errors.push(`${label} : « ${term.slice(0, 20)}${term.length > 20 ? "…" : ""} » doit faire de ${TERM_MIN} à ${TERM_MAX} caractères.`);
      continue;
    }
    const key = comparable(term);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
  }
  if (out.length > TERMS_MAX) errors.push(`${label} : ${TERMS_MAX} éléments au maximum (il y en a ${out.length}).`);
  return out;
}

/** Valide ce que le navigateur envoie pour modifier un périmètre : rien n'est supposé, tout est borné. */
export function validateScopeEdit(raw: unknown): ScopeEditValidation {
  const errors: string[] = [];
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;

  const countries: string[] = [];
  if (!Array.isArray(body.countries)) {
    errors.push("Pays : une liste est attendue.");
  } else {
    for (const entry of body.countries) {
      const code = typeof entry === "string" ? entry.trim().toUpperCase() : "";
      if (!COUNTRY_CODES.some((known) => known.iso3 === code)) errors.push(`Pays inconnu : « ${String(entry).slice(0, 12)} ».`);
      else if (!countries.includes(code)) countries.push(code);
    }
    if (countries.length === 0 && errors.length === 0) errors.push("Choisis au moins un pays.");
    if (countries.length > COUNTRIES_MAX) errors.push(`${COUNTRIES_MAX} pays au maximum.`);
  }

  const objective = OBJECTIVES.find((entry) => entry.key === body.objective)?.key;
  if (!objective) errors.push("Objectif inconnu.");

  const keywords = cleanTerms(body.keywords, "Mots-clés", errors);
  const entities = cleanTerms(body.entities, "Entités", errors);
  const exclusions = cleanTerms(body.exclusions, "Exclusions", errors);

  return errors.length > 0 || !objective ? { ok: false, errors } : { ok: true, value: { countries, objective, keywords, entities, exclusions } };
}

/** Ce que l'écran affiche d'un périmètre existant (les listes absentes d'anciennes versions valent « vide »). */
export function editOf(snapshot: ScopeSnapshot): ScopeEdit {
  const zone = snapshot.scope.primaryZone;
  return {
    countries: zone.kind === "countries" ? [...zone.codes] : [...snapshot.scope.countries],
    objective: snapshot.scope.objective,
    keywords: [...snapshot.scope.keywords],
    entities: [...snapshot.scope.entities],
    exclusions: [...(snapshot.scope.exclusions ?? [])],
  };
}

/** Périmètre résultant : on remplace ce que l'écran gère, on conserve le reste (sources, estimation de volume et de coût). */
export function applyScopeEdit(current: ScopeSnapshot, edit: ScopeEdit): ScopeSnapshot {
  return {
    scope: {
      ...current.scope,
      primaryZone: { kind: "countries", codes: [...edit.countries] },
      countries: [...edit.countries],
      objective: edit.objective,
      keywords: [...edit.keywords],
      entities: [...edit.entities],
      exclusions: [...edit.exclusions],
    },
    estimate: current.estimate,
  };
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((value, index) => value === b[index]);

/** Vrai si l'édition ne change rien (même ordre, même graphie) : le serveur n'enregistre alors AUCUNE nouvelle version. */
export function isUnchanged(current: ScopeSnapshot, edit: ScopeEdit): boolean {
  const before = editOf(current);
  return before.objective === edit.objective && sameList(before.countries, edit.countries) && sameList(before.keywords, edit.keywords) && sameList(before.entities, edit.entities) && sameList(before.exclusions, edit.exclusions);
}
