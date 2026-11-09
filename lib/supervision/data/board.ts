// Supervision V1, Lot 3 : lecture, côté SERVEUR, des données publiques du site (articles analysés et signalements médiatiques)
// pour le périmètre d'une Supervision. Clé serveur (service_role) : les tables n'ont aucune lecture publique en préproduction.
// Jamais d'appel IA ici, jamais d'écriture : lecture seule.

import { adminDb, type Db } from "../core/store";
import type { ScopeSnapshot } from "../core/majorChange";
import type { BoardEvent } from "../dashboard/fixtures";
import { dedupeEvents } from "./dedupe";
import { briefToEvent, eventToEvent, matchCountry, type BriefRow, type CountryMatch, type EventRow } from "./mapping";

export const HISTORY_DAYS = 90;
export const ARTICLE_LIMIT = 1500;
export const SIGNAL_LIMIT = 2000;

const BRIEF_COLUMNS = "id, zone_slug, title, summary, source_urls, source_domains, published_at, countries, primary_theme, event_type, importance, veracity, source_count, place_name, place_country, latitude, longitude";
const EVENT_COLUMNS = "id, event_date, country, latitude, longitude, category, source, num_mentions, summary";

export interface BoardData {
  events: BoardEvent[];
  countries: { iso3: string; name: string }[];
  coverage: {
    articles: number;
    signals: number;
    /** Entrées regroupées car elles décrivent la même publication (voir dedupe.ts). */
    merged: number;
    /** Premier et dernier fait retrouvés (ISO) ; null s'il n'y en a aucun. */
    earliest: string | null;
    latest: string | null;
    /** Vrai si une limite de lecture a été atteinte : le tableau ne montre alors pas tout. */
    truncated: boolean;
    /** Les modules combinent le pays d'un article (champ « countries »), son lieu et les libellés de pays des signalements. */
    method: string;
  };
  /** Vrai tant que la base lue est un ÉCHANTILLON (préproduction). */
  sample: boolean;
}

export class DataError extends Error {}

/** Pays du périmètre : seule une zone « pays » est lue pour l'instant (les zones en cercle viendront avec la collecte dédiée). */
export function countriesOf(snapshot: ScopeSnapshot): CountryMatch[] {
  const zone = snapshot.scope.primaryZone;
  const codes = zone.kind === "countries" ? zone.codes : [];
  return codes.map((code) => matchCountry(code)).filter((match): match is CountryMatch => match !== null);
}

const quoted = (value: string) => `"${value.replace(/"/g, "")}"`;

export async function loadBoardData(snapshot: ScopeSnapshot, now: Date = new Date(), client: Db = adminDb()): Promise<BoardData> {
  const countries = countriesOf(snapshot);
  const sample = process.env.SUPERVISION_DATA_SAMPLE !== "0";
  const method = "Articles rattachés au pays (champ « pays » ou lieu) et signalements médiatiques portant ce pays. Un article qui n'a pas de pays renseigné peut manquer.";
  if (countries.length === 0) {
    return { events: [], countries: [], coverage: { articles: 0, signals: 0, merged: 0, earliest: null, latest: null, truncated: false, method }, sample };
  }
  const since = new Date(now.getTime() - HISTORY_DAYS * 86_400_000);
  const codes = countries.map((country) => country.iso3).join(",");
  const frenchNames = countries.map((country) => quoted(country.name)).join(",");
  const eventNames = [...new Set(countries.flatMap((country) => country.eventNames))];

  const [articles, signals] = await Promise.all([
    client
      .from("zone_briefs")
      .select(BRIEF_COLUMNS)
      .or(`countries.ov.{${codes}},place_country.in.(${frenchNames})`)
      .gte("published_at", since.toISOString())
      .order("published_at", { ascending: false })
      .limit(ARTICLE_LIMIT),
    client
      .from("conflict_events")
      .select(EVENT_COLUMNS)
      .in("country", eventNames)
      .gte("event_date", since.toISOString().slice(0, 10))
      .order("event_date", { ascending: false })
      .limit(SIGNAL_LIMIT),
  ]);
  if (articles.error) throw new DataError(`Lecture des articles impossible : ${articles.error.message}`);
  if (signals.error) throw new DataError(`Lecture des signalements impossible : ${signals.error.message}`);

  const articleRows = (articles.data ?? []) as unknown as BriefRow[];
  const signalRows = (signals.data ?? []) as unknown as EventRow[];
  const sorted = [...articleRows.map(briefToEvent), ...signalRows.map(eventToEvent)].sort((a, b) => b.at.localeCompare(a.at));
  const { events, merged } = dedupeEvents(sorted);
  return {
    events,
    countries: countries.map(({ iso3, name }) => ({ iso3, name })),
    coverage: {
      articles: events.filter((event) => event.kind === "article").length,
      signals: events.filter((event) => event.kind === "signal").length,
      merged,
      earliest: events.length ? events[events.length - 1].at : null,
      latest: events.length ? events[0].at : null,
      truncated: articleRows.length >= ARTICLE_LIMIT || signalRows.length >= SIGNAL_LIMIT,
      method,
    },
    sample,
  };
}
