// Supervision V1 : regroupement des publications de presse qui racontent la MÊME histoire (module PUR, testé, sans IA, sans réseau).
//
// Constat sur « Test Nigeria » : la même attaque apparaît sous trois ou quatre titres presque identiques (agences et reprises). Le
// dédoublonnage par adresse (dedupe.ts) ne les voit pas : les adresses diffèrent. Ici on compare les TITRES.
//
// Règles de prudence :
//  - un regroupement masque de l'information : on préfère rater un regroupement que fusionner deux histoires différentes ;
//  - seules les publications de presse collectées (kind « publication ») sont regroupées : les articles analysés et les signalements
//    ont déjà leur propre traitement ;
//  - deux publications ne sont regroupées que si elles sont proches dans le temps (fenêtre de 72 h) ;
//  - le regroupement n'est PAS une preuve : plusieurs médias qui reprennent une même dépêche ne forment pas autant de sources
//    indépendantes (cahier des charges, section 4). Il n'augmente jamais la vérification ni la priorité.
// Le représentant d'une histoire est la publication la plus ANCIENNE (à égalité, la plus petite référence) : il ne change pas quand une
// reprise plus tardive arrive, ce qui garde stables les notes attachées à cette publication.

import type { BoardEvent, StoryMember } from "../dashboard/fixtures";

export const STORY_WINDOW_HOURS = 72;
/**
 * Similarité minimale (Jaccard : mots communs / mots en tout) pour rattacher une publication à une histoire. Mesure sur « Test Nigeria » :
 * les vraies reprises font 0,57 à 1,00, la paire la plus proche qui raconte deux faits différents fait 0,33. Volontairement SANS pondération
 * par la rareté des mots : le résultat ne dépend pas du nombre de publications présentes, un même couple de titres donne toujours le même verdict.
 */
export const STORY_THRESHOLD = 0.45;
/** Nombre minimal de mots (hors mots courants) en commun, quelle que soit la similarité. */
export const STORY_MIN_SHARED = 4;

const STOPWORDS = new Set(
  (
    "a an the and or but of in on at to for from by with as is are was were be been being it its this that these those into over after before " +
    "says say said new news update live more than not no vs via amid against about up out off down who whom what which when where how why " +
    "le la les un une des du de d l et ou mais en dans sur sous par pour avec sans est sont etait ete ce cet cette ces au aux se sa son ses " +
    "qui que quoi dont ne pas plus apres avant selon contre vers chez"
  ).split(" "),
);

const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20",
  un: "1", deux: "2", trois: "3", quatre: "4", cinq: "5", sept: "7", huit: "8", neuf: "9", dix: "10", onze: "11", douze: "12",
  treize: "13", quatorze: "14", quinze: "15", seize: "16", vingt: "20",
};

/** Mots significatifs d'un titre : minuscules, sans accents ni ponctuation, mots courants retirés, pluriels réduits, nombres en chiffres. */
export function titleTokens(title: string): string[] {
  const words = title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
  const tokens = new Set<string>();
  for (const raw of words) {
    if (STOPWORDS.has(raw)) continue;
    const word = NUMBER_WORDS[raw] ?? raw;
    if (word.length < 2 && !/^\d$/.test(word)) continue;
    tokens.add(word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word);
  }
  return [...tokens];
}

export interface Similarity {
  score: number;
  shared: number;
}

export function similarity(a: readonly string[], b: readonly string[]): Similarity {
  const setB = new Set(b);
  let shared = 0;
  for (const token of a) if (setB.has(token)) shared += 1;
  const union = a.length + b.length - shared;
  return { score: union > 0 ? shared / union : 0, shared };
}

export interface StoriesResult {
  events: BoardEvent[];
  /** Nombre de publications absorbées dans une histoire déjà présente. */
  grouped: number;
}

const memberOf = (event: BoardEvent): StoryMember => ({ id: event.id, title: event.title, source: event.domains?.[0] ?? null, url: event.url, at: event.at });

/**
 * Regroupe les publications de presse qui racontent la même histoire. L'ordre d'origine (du plus récent au plus ancien) est conservé,
 * à la place du représentant. Les autres événements passent tels quels.
 */
export function groupStories(events: readonly BoardEvent[]): StoriesResult {
  const candidates = events.filter((event) => event.kind === "publication");
  if (candidates.length < 2) return { events: [...events], grouped: 0 };

  const tokens = new Map<string, string[]>(candidates.map((event) => [event.id, titleTokens(event.title)]));
  const windowMs = STORY_WINDOW_HOURS * 3_600_000;

  // Du plus ancien au plus récent : la première publication d'une histoire en est le représentant.
  const ascending = [...candidates].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const stories: { rep: BoardEvent; members: BoardEvent[] }[] = [];
  for (const event of ascending) {
    const own = tokens.get(event.id) ?? [];
    let best: { story: (typeof stories)[number]; score: number } | null = null;
    for (const story of stories) {
      // La publication doit être proche (dans le temps) d'au moins un membre, et ressembler à un membre ET, de loin, au représentant.
      let top = 0;
      for (const member of [story.rep, ...story.members]) {
        if (Math.abs(Date.parse(event.at) - Date.parse(member.at)) > windowMs) continue;
        const { score, shared } = similarity(own, tokens.get(member.id) ?? []);
        if (shared >= STORY_MIN_SHARED && score >= STORY_THRESHOLD && score > top) top = score;
      }
      if (top === 0) continue;
      const toRep = similarity(own, tokens.get(story.rep.id) ?? []).score;
      if (toRep < STORY_THRESHOLD * 0.6) continue;
      if (!best || top > best.score) best = { story, score: top };
    }
    if (best) best.story.members.push(event);
    else stories.push({ rep: event, members: [] });
  }

  const replacement = new Map<string, BoardEvent>();
  const absorbed = new Set<string>();
  for (const { rep, members } of stories) {
    if (members.length === 0) continue;
    const located = [rep, ...members].find((entry) => entry.geo && entry.lat !== undefined && entry.lon !== undefined);
    const geoFromStory = located && located !== rep && !rep.geo ? located : null;
    replacement.set(rep.id, {
      ...rep,
      publications: 1 + members.length,
      domains: [...new Set([rep, ...members].flatMap((entry) => entry.domains ?? []))],
      story: { members: members.map(memberOf) },
      ...(geoFromStory ? { place: geoFromStory.place, lat: geoFromStory.lat, lon: geoFromStory.lon, geo: geoFromStory.geo, storyGeo: true } : {}),
    });
    for (const member of members) absorbed.add(member.id);
  }

  const out: BoardEvent[] = [];
  for (const event of events) {
    if (absorbed.has(event.id)) continue;
    out.push(replacement.get(event.id) ?? event);
  }
  return { events: out, grouped: absorbed.size };
}
