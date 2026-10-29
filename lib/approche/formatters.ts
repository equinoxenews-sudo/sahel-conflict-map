import type { Observation } from "./schema";

// Mise en forme française des observations. Le texte affiché vient toujours de l'observation (valeur, unité, période) :
// aucun chiffre n'est écrit à la main dans les composants.

// Le séparateur de milliers devient une espace insécable : un nombre n'est jamais coupé entre deux lignes.
const plain = (text: string) => text.replace(/ /g, " ");

function number(value: number, maximumFractionDigits: number): string {
  return plain(new Intl.NumberFormat("fr-FR", { maximumFractionDigits, minimumFractionDigits: 0 }).format(value));
}

/** « 68,7 millions », « 3 366 Md », « 48 986 » : valeur lisible d'une observation chiffrée, sans l'unité. */
export function formatValue(observation: Observation): string {
  const { value, unit } = observation;
  if (value === null) return "Donnée non disponible";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "string") return value;
  if (unit === "habitants") {
    if (value >= 1_000_000) return `${number(value / 1_000_000, 1)} millions`;
    return number(Math.round(value / 1000) * 1000, 0);
  }
  if (unit === "USD" || unit === "EUR") {
    // « Md » (milliards) jusque dans les billions : « 3 366 Md » tient sur une ligne, « 3,37 billions » se coupait en deux.
    if (value >= 1e12) return `${number(value / 1e9, 0)} Md`;
    if (value >= 1e9) return `${number(value / 1e9, value >= 1e11 ? 0 : 1)} Md`;
    return number(Math.round(value), 0);
  }
  if (unit === "%") return `${value > 0 && observation.key.includes("growth") ? "+" : ""}${number(value, 1)}`;
  if (unit === "km²") return number(Math.round(value), 0);
  return number(value, 2);
}

/** Unité affichée après la valeur (« USD », « % », « km² »). */
export function formatUnit(observation: Observation): string {
  const { unit, value } = observation;
  if (unit === "habitants" || typeof value === "string" || typeof value === "boolean") return "";
  if (unit === "USD" || unit === "EUR") return unit === "USD" ? "$ US" : "€";
  return unit ?? "";
}

/** Valeur et unité sur une ligne : « 3 366 Md $ US ». */
export function formatWithUnit(observation: Observation): string {
  const unit = formatUnit(observation);
  const value = formatValue(observation);
  return unit && value !== "Donnée non disponible" ? `${value}${unit === "%" ? " %" : ` ${unit}`}` : value;
}

/** Date AAAA-MM-JJ en « 29 octobre 2026 ». */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // Une date incomplète (« 2010 ») reste telle quelle : on ne lui invente pas de jour ni de mois.
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
