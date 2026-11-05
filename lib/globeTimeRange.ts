// Période du globe : calculs purs du curseur (frise, bornes, sélection), testés dans tests/globe-time-range.test.ts.
//
// Décision de Nicolas (05/11/2026) : la sélection par défaut reste les 5 derniers jours, mais la frise n'en montre que 10 (les 9 derniers
// jours plus aujourd'hui), pour que la plage et ses poignées soient larges et faciles à saisir. Deux calendriers, aux deux bouts de la frise,
// permettent de l'allonger ou de la raccourcir, dans les limites des données : 60 jours d'historique, 30 jours à venir (lancements).

export const DAY_MS = 24 * 60 * 60 * 1000;
export const PAST_DAYS = 60;
export const FUTURE_DAYS = 30;
/** Jours de la frise par défaut, aujourd'hui compris. */
export const DEFAULT_SPAN_DAYS = 10;
/** Jours sélectionnés par défaut, aujourd'hui compris. */
export const DEFAULT_SELECTED_DAYS = 5;
/** Plus petite sélection possible. */
export const MIN_RANGE_MS = DAY_MS;
/** Plus petite frise possible (jours entiers). */
export const MIN_SPAN_DAYS = 2;

export interface TimeBounds {
  start: number;
  end: number;
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Jours à ajouter à une date locale, en passant correctement l'heure d'été (jamais 24 h fixes). */
export function addDays(t: number, days: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Frise par défaut : du début du 9e jour précédent à la fin d'aujourd'hui (10 jours). */
export function defaultBounds(now: number): TimeBounds {
  return { start: startOfDay(addDays(now, -(DEFAULT_SPAN_DAYS - 1))), end: endOfDay(now) };
}

/** Sélection par défaut : les 5 derniers jours, jusqu'à la fin d'aujourd'hui. */
export function defaultSelection(now: number): TimeBounds {
  return { start: startOfDay(addDays(now, -(DEFAULT_SELECTED_DAYS - 1))), end: endOfDay(now) };
}

/** Limites absolues de la frise (60 jours d'historique, 30 jours à venir). */
export function absoluteLimits(now: number): TimeBounds {
  return { start: startOfDay(addDays(now, -PAST_DAYS)), end: endOfDay(addDays(now, FUTURE_DAYS)) };
}

/** Date locale au format des champs « date » (AAAA-MM-JJ). */
export function toInputValue(t: number): string {
  const d = new Date(t);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/** Date saisie (AAAA-MM-JJ) en instant local : début de journée, ou fin de journée pour la borne de droite. Null si la saisie est invalide. */
export function fromInputValue(value: string, endOfDayBound: boolean): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  if (Number.isNaN(d.getTime()) || d.getMonth() !== Number(match[2]) - 1) return null;
  return endOfDayBound ? endOfDay(d.getTime()) : d.getTime();
}

/**
 * Nouvelle frise après un choix de date à gauche ou à droite, ramenée dans les limites : jamais hors données, jamais moins de
 * MIN_SPAN_DAYS jours. Une saisie invalide ou impossible laisse la frise inchangée.
 */
export function withEdge(bounds: TimeBounds, edge: "start" | "end", value: string, now: number): TimeBounds {
  const picked = fromInputValue(value, edge === "end");
  if (picked === null) return bounds;
  const limits = absoluteLimits(now);
  if (edge === "start") {
    const latest = startOfDay(addDays(bounds.end, -(MIN_SPAN_DAYS - 1)));
    return { start: Math.min(Math.max(picked, limits.start), latest), end: bounds.end };
  }
  const earliest = endOfDay(addDays(bounds.start, MIN_SPAN_DAYS - 1));
  return { start: bounds.start, end: Math.max(Math.min(picked, limits.end), earliest) };
}

/** Sélection ramenée dans la frise : décalée si elle dépasse, rognée si elle est plus large que la frise. */
export function clampSelection(selection: TimeBounds, bounds: TimeBounds): TimeBounds {
  const width = Math.min(selection.end - selection.start, bounds.end - bounds.start);
  let start = selection.start;
  let end = selection.start + width;
  if (start < bounds.start) {
    start = bounds.start;
    end = start + width;
  }
  if (end > bounds.end) {
    end = bounds.end;
    start = end - width;
  }
  return { start, end };
}

/** Même sélection, même frise, à la milliseconde près. */
export function sameBounds(a: TimeBounds, b: TimeBounds): boolean {
  return a.start === b.start && a.end === b.end;
}
