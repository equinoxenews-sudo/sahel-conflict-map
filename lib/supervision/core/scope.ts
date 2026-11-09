import { COUNTRY_CODES } from "../../countryCodes";
import type { ScopeSnapshot } from "./majorChange";

// Supervision V1 : définition initiale d'une Supervision à la création (nom, pays, objectif). Le périmètre complet (sources,
// mots-clés, entités, zones dessinées) s'enrichira avec le moteur de veille (Lot 4) ; ici on ne pose que ce qui sert déjà : une zone
// principale et un objectif, avec une estimation de volume et de coût INCONNUE (donc signalée comme non fiable le moment venu).

export const OBJECTIVES = [
  { key: "securite", label: "Sécurité et conflits" },
  { key: "politique", label: "Politique et gouvernance" },
  { key: "diplomatie", label: "Diplomatie et relations internationales" },
  { key: "economie", label: "Économie et sanctions" },
  { key: "humanitaire", label: "Humanitaire et santé" },
] as const;

export type ObjectiveKey = (typeof OBJECTIVES)[number]["key"];

export const NAME_MIN = 3;
export const NAME_MAX = 80;

export interface CreateInput {
  name: string;
  country: string;
  objective: ObjectiveKey;
}

export type CreateValidation = { ok: true; value: CreateInput } | { ok: false; errors: string[] };

/** Valide ce que le navigateur envoie à la création : rien n'est supposé, tout est borné. */
export function validateCreateInput(raw: unknown): CreateValidation {
  const errors: string[] = [];
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < NAME_MIN || name.length > NAME_MAX) errors.push(`Le nom doit faire de ${NAME_MIN} à ${NAME_MAX} caractères.`);
  const country = typeof body.country === "string" ? body.country.trim().toUpperCase() : "";
  if (!COUNTRY_CODES.some((entry) => entry.iso3 === country)) errors.push("Pays inconnu.");
  const objective = OBJECTIVES.find((entry) => entry.key === body.objective)?.key;
  if (!objective) errors.push("Objectif inconnu.");
  return errors.length > 0 || !objective ? { ok: false, errors } : { ok: true, value: { name, country, objective } };
}

export function initialScope(input: CreateInput): ScopeSnapshot {
  return {
    scope: { primaryZone: { kind: "countries", codes: [input.country] }, objective: input.objective, countries: [input.country], sources: [], keywords: [], entities: [] },
    estimate: { volumePerMonth: null, volumeConfidence: "unknown", aiCostUsdPerMonth: null, costConfidence: "unknown" },
  };
}
