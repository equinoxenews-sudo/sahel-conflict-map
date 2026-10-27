import { COUNTRY_PROFILES_LIST } from "../countries";
import { mapWithConcurrency } from "../gdelt";
import { LAYER_FETCH_HEADERS } from "./fetchHeaders";

// Catastrophes naturelles du monde entier, sans clé :
// - GDACS (ONU / Commission européenne) : feux de forêt, cyclones, inondations, volcans et
//   sécheresses partout dans le monde, avec niveau d'alerte, intensité et rapport détaillé ;
// - EONET (NASA) : volcans en éruption (Smithsonian) et tempêtes, en complément.
// Les feux EONET ne sont plus utilisés : quasi exclusivement américains et très nombreux.
// Deux mois d'historique : seul le filtre « Période » du globe décide de l'affichage.

const HISTORY_DAYS = 60;
const FETCH_TIMEOUT_MS = 15000;
const GDACS_PAGE = 100;
const GDACS_MAX_PAGES: Record<GdacsType, number> = { WF: 15, FL: 4, TC: 2, VO: 1, DR: 1 };
const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";

export type NaturalEventCategory = "wildfires" | "severeStorms" | "volcanoes" | "floods" | "droughts";

export interface NaturalEvent {
  id: string;
  title: string;
  category: NaturalEventCategory;
  lat: number;
  lon: number;
  /** Début de l'événement (ou date de l'observation). */
  date: string | null;
  /** Fin ou dernière mise à jour (événement en cours : affiché tant qu'il chevauche la période). */
  endDate: string | null;
  country: string | null;
  /** Niveau d'alerte GDACS : Green, Orange, Red. */
  alert: string | null;
  /** Intensité en clair (« 6 641 ha brûlés », « vents de 194 km/h »…). */
  severity: string | null;
  source: "GDACS" | "EONET";
  links: { label: string; href: string }[];
}

type GdacsType = "WF" | "TC" | "FL" | "VO" | "DR";

const GDACS_CATEGORY: Record<GdacsType, NaturalEventCategory> = {
  WF: "wildfires",
  TC: "severeStorms",
  FL: "floods",
  VO: "volcanoes",
  DR: "droughts",
};

const GDACS_KIND: Record<GdacsType, string> = {
  WF: "Feu de forêt",
  TC: "Cyclone tropical",
  FL: "Inondation",
  VO: "Éruption volcanique",
  DR: "Sécheresse",
};

interface GdacsFeature {
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: {
    eventtype?: GdacsType;
    eventid?: number;
    episodeid?: number;
    name?: string;
    country?: string;
    iso3?: string;
    fromdate?: string;
    todate?: string;
    alertlevel?: string;
    url?: { report?: string };
    severitydata?: { severity?: number; severitytext?: string; severityunit?: string };
  };
}

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: LAYER_FETCH_HEADERS });
    if (!res.ok) {
      console.error(`Natural events source responded ${res.status} (${url})`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("Failed to fetch natural events:", url, err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** GDACS publie en heure UTC sans fuseau explicite. */
function gdacsDate(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function severityText(type: GdacsType, s: GdacsFeature["properties"]): string | null {
  const data = s?.severitydata;
  if (!data) return null;
  const n = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  if (type === "WF" && data.severity) return `${n.format(data.severity)} ha touchés`;
  if (type === "TC" && data.severity) return `Vents jusqu'à ${n.format(data.severity)} km/h`;
  // « Medium impact for agricultural drought in 1759971 km2 » → en français.
  const dr = /^(Minor|Low|Medium|High)\s+impact for agricultural drought in\s+([\d.]+)\s*km2/i.exec(data.severitytext ?? "");
  if (dr) {
    const level = { minor: "faible", low: "faible", medium: "moyen", high: "fort" }[dr[1].toLowerCase() as "low"];
    return `Impact ${level} sur l'agriculture, sur ${n.format(Number(dr[2]))} km²`;
  }
  // Inondations : GDACS publie souvent « Magnitude 0 », sans signification pour le lecteur.
  if (/^Magnitude\s+0(\.0+)?\b/i.test(data.severitytext ?? "")) return null;
  return data.severitytext?.trim() || null;
}

/** Nom français d'un pays à partir de son code ISO 3 (GDACS publie en anglais). */
const FRENCH_BY_ISO3 = new Map<string, string>([
  // Grands pays absents des fiches pays du site.
  ["USA", "États-Unis"],
  ["CHN", "Chine"],
  ["RUS", "Russie"],
  ["JPN", "Japon"],
  ["IND", "Inde"],
  ["AUS", "Australie"],
  ["CAN", "Canada"],
  ["MEX", "Mexique"],
  ["IDN", "Indonésie"],
  ["PHL", "Philippines"],
  ["NZL", "Nouvelle-Zélande"],
  ["GBR", "Royaume-Uni"],
  ...COUNTRY_PROFILES_LIST.map((c) => [c.iso3, c.name] as [string, string]),
]);

function frenchCountry(p: GdacsFeature["properties"]): string | null {
  const iso = p?.iso3?.trim().toUpperCase();
  return (iso && FRENCH_BY_ISO3.get(iso)) || p?.country?.trim() || null;
}

/** Titre en français : nom propre conservé pour les cyclones et volcans (« TRUDY-26 »). */
function frenchTitle(type: GdacsType, p: GdacsFeature["properties"], country: string | null): string {
  const kind = GDACS_KIND[type];
  const proper = type === "TC" || type === "VO" ? p?.name?.replace(/^(Tropical Cyclone|Volcano|Volcanic eruption)s*/i, "").trim() : "";
  return [kind + (proper ? ` ${proper}` : ""), country].filter(Boolean).join(" — ");
}

async function fetchGdacsType(type: GdacsType, from: string, to: string): Promise<NaturalEvent[]> {
  const out: NaturalEvent[] = [];
  // Pages lues quatre par quatre (les feux en comptent une quinzaine sur deux mois).
  const pages = Array.from({ length: GDACS_MAX_PAGES[type] }, (_, i) => i + 1);
  // Une page sans réponse (GDACS en panne ou très lent) arrête la lecture des suivantes : sinon quinze pages à 15 s de
  // délai dépassent à elles seules la minute accordée à la construction de la page d'accueil, et le déploiement échoue.
  let sourceDown = false;
  const results = await mapWithConcurrency(pages, 4, async (page) => {
    if (sourceDown) return null;
    const data = await getJson<{ features?: GdacsFeature[] }>(
      `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=${type}&fromDate=${from}&toDate=${to}&alertlevel=green;orange;red&pagesize=${GDACS_PAGE}&pagenumber=${page}`,
    );
    if (data === null) sourceDown = true;
    return data;
  });
  for (const data of results) {
    const features = data?.features ?? [];
    for (const f of features) {
      const p = f.properties;
      const c = f.geometry?.coordinates;
      if (!p?.eventid || !Array.isArray(c)) continue;
      const country = frenchCountry(p);
      out.push({
        id: `gdacs-${type}-${p.eventid}-${p.episodeid ?? 0}`,
        title: frenchTitle(type, p, country),
        category: GDACS_CATEGORY[type],
        lon: c[0],
        lat: c[1],
        date: gdacsDate(p.fromdate),
        endDate: gdacsDate(p.todate),
        country,
        alert: p.alertlevel ?? null,
        severity: severityText(type, p),
        source: "GDACS",
        links: p.url?.report ? [{ label: "Rapport GDACS →", href: p.url.report }] : [],
      });
    }
  }
  // Un même événement revient à chaque épisode : seul le plus récent est gardé.
  const latest = new Map<string, NaturalEvent>();
  for (const e of out) {
    const key = e.id.replace(/-d+$/, "");
    const cur = latest.get(key);
    if (!cur || (e.endDate ?? "") > (cur.endDate ?? "")) latest.set(key, e);
  }
  return [...latest.values()];
}

interface EonetEvent {
  id?: string;
  title?: string;
  link?: string;
  categories?: { id?: string }[];
  sources?: { id?: string; url?: string }[];
  geometry?: { date?: string; coordinates?: [number, number]; magnitudeValue?: number | null; magnitudeUnit?: string | null }[];
}

async function fetchEonet(now: number): Promise<NaturalEvent[]> {
  // Volcans : sans limite de date (une éruption ouverte depuis des mois reste active) ;
  // tempêtes : les 60 derniers jours.
  const [volcanoes, storms] = await Promise.all([
    getJson<{ events?: EonetEvent[] }>(`${EONET_URL}?status=open&category=volcanoes`),
    getJson<{ events?: EonetEvent[] }>(`${EONET_URL}?status=open&category=severeStorms&days=${HISTORY_DAYS}`),
  ]);
  const out: NaturalEvent[] = [];
  for (const e of [...(volcanoes?.events ?? []), ...(storms?.events ?? [])]) {
    const cat = e.categories?.[0]?.id;
    if ((cat !== "volcanoes" && cat !== "severeStorms") || !e.id || !e.title) continue;
    const first = e.geometry?.[0];
    const last = e.geometry?.at(-1);
    if (!last?.coordinates) continue;
    const mag = last.magnitudeValue != null ? `${last.magnitudeValue} ${last.magnitudeUnit ?? ""}`.trim() : null;
    out.push({
      id: `eonet-${e.id}`,
      title: e.title,
      category: cat,
      lon: last.coordinates[0],
      lat: last.coordinates[1],
      date: first?.date ?? last.date ?? null,
      // Événement encore « ouvert » : il dure jusqu'à aujourd'hui (visible quelle que soit la période).
      endDate: new Date(now).toISOString(),
      country: null,
      alert: null,
      severity: mag,
      source: "EONET",
      links: (e.sources ?? []).filter((s) => s.url).slice(0, 2).map((s) => ({ label: `${s.id ?? "Source"} →`, href: s.url! })),
    });
  }
  return out;
}

/** Même phénomène vu par les deux sources (volcan, tempête) : la fiche GDACS est gardée. */
function dedupe(events: NaturalEvent[]): NaturalEvent[] {
  const kept: NaturalEvent[] = [];
  for (const e of events) {
    const twin = kept.find(
      (k) => k.category === e.category && k.source !== e.source && Math.abs(k.lat - e.lat) < 0.5 && Math.abs(k.lon - e.lon) < 0.5,
    );
    if (!twin) kept.push(e);
    else twin.links.push(...e.links);
  }
  return kept;
}

export async function fetchNaturalEvents(now = Date.now()): Promise<NaturalEvent[]> {
  const from = new Date(now - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(now + 86_400_000).toISOString().slice(0, 10);
  const types: GdacsType[] = ["WF", "TC", "FL", "VO", "DR"];
  const [eonet, ...gdacs] = await Promise.all([fetchEonet(now), ...types.map((t) => fetchGdacsType(t, from, to))]);
  return dedupe([...gdacs.flat(), ...eonet]);
}
