"use client";

import { useEffect, useRef } from "react";
import type * as CesiumNS from "cesium";
import { RISK_COLORS, type CountryRisk } from "@/lib/countryRisk";
import type { MilitaryAircraft } from "@/lib/layers/aircraft";
import { confidenceColor } from "@/lib/confidence";
import type { AnalystEvent } from "@/lib/layers/analystEvents";
import type { Earthquake } from "@/lib/layers/earthquakes";
import type { Launch } from "@/lib/layers/launches";
import type { NaturalEvent, NaturalEventCategory } from "@/lib/layers/naturalEvents";
import type { SatellitePosition } from "@/lib/layers/satellites";
import type { EntityPopupData, LayerKey } from "@/lib/layers/types";
import type { VesselPosition } from "@/types/vessel";
import { CESIUM_BASE_URL } from "@/lib/cesiumCdn";
import { INTRO_ATTR, INTRO_EVENTS } from "@/lib/homeIntro";
import { isHomeZone, ZONE_GLOBE_VIEWS, type ZoneSlug } from "@/lib/homeZones";
import { countryCodeOfEntityId, globeCountryInfo } from "@/lib/globeCountry";
import { getHoveredBrief, onHoveredBrief } from "@/lib/briefHover";
import { CLUSTER_MIN_SIZE, CLUSTER_PIXEL_RANGE, GLOBE_CLUSTERING_ENABLED, GLOBE_TEST_TOOLS, RING_DOUBLE_FROM, blinkLevel, clusterDotCanvasSize, clusterDotDiameter, distinctIds, explodedAtHeight, isColocated, pointStyleFromSearch, ringCanvasSize, ringDiameter, type EventMode } from "@/lib/globeClustering";
import styles from "./Globe3D.module.css";
import type { GlobeDateRange } from "./GlobeTimeRange";

// Esri's free World Imagery tile service — no API key, no Cesium ion
// account. This is what gives the globe real tiled detail that sharpens
// as you zoom in, unlike a single static texture.
const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const IMAGERY_CREDIT = "Esri, Maxar, Earthstar Geographics";

// A second, transparent Esri layer stacked on top of the imagery above —
// country/state borders plus city and capital labels. Same free service
// (no key, no Cesium ion), confirmed by inspecting paraxis.app's own
// network requests: it layers these same two Esri MapServer tile sets.
const BOUNDARIES_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

// Cesium is loaded as a plain <script> from a CDN rather than
// `import("cesium")`. Bundling Cesium's own code through Turbopack's
// production minifier corrupts it into "Octal escape sequences are not
// allowed in template strings" at runtime (confirmed by reverting to a
// Cesium-only commit with no other changes — the crash is in Cesium's
// own bundled code, not ours). Loading it as an unminified CDN script
// sidesteps the bundler entirely, which is the standard workaround for
// Cesium in webpack/Turbopack projects. Only *types* are imported from
// the npm package (`import type * as CesiumNS`), which is erased at
// compile time and never touches the runtime bundle.

declare global {
  interface Window {
    Cesium?: typeof CesiumNS;
    CESIUM_BASE_URL?: string;
  }
}

let cesiumLoadPromise: Promise<typeof CesiumNS> | null = null;

function loadCesium(): Promise<typeof CesiumNS> {
  if (window.Cesium) return Promise.resolve(window.Cesium);
  if (cesiumLoadPromise) return cesiumLoadPromise;

  cesiumLoadPromise = new Promise((resolve, reject) => {
    window.CESIUM_BASE_URL = CESIUM_BASE_URL;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${CESIUM_BASE_URL}Widgets/widgets.css`;
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = `${CESIUM_BASE_URL}Cesium.js`;
    script.onload = () => {
      if (window.Cesium) resolve(window.Cesium);
      else reject(new Error("Cesium script loaded but window.Cesium is missing"));
    };
    script.onerror = () => reject(new Error("Failed to load Cesium script"));
    document.head.appendChild(script);
  });

  return cesiumLoadPromise;
}

// The Sahel/Africa-centered default view (also used to reset the camera
// via the "recentrer" control button) — see the camera.setView call below
// for why this beats Cesium's generic flyHome().
const DEFAULT_LON = 15;
const DEFAULT_LAT = 15;
const DEFAULT_HEIGHT = 17_000_000;

// Introduction : la caméra part de loin, côté Asie (le jour/nuit y est bien visible)
// et rejoint la vue d'accueil.
const INTRO_START_LON = 85;
const INTRO_START_LAT = 8;
const INTRO_START_HEIGHT = 48_000_000;
const INTRO_FLIGHT_SECONDS = 9;
/** Opacité de l'imagerie du côté nuit (0 = noir, 1 = comme le jour). */
const BASE_NIGHT_ALPHA = 0.14;
// Distances d'éclairage de Cesium : nuit franche pendant l'introduction, réglage par défaut ensuite.
const LIGHTING_INTRO = { out: 5.0e6, in: 1.2e7 };
const LIGHTING_HOME = { out: 1.0e7, in: 2.0e7 };

/** Position de la caméra pour une zone : point visé et altitude (plus haute sur écran en hauteur). */
function zoneCameraDestination(Cesium: typeof CesiumNS, zone: ZoneSlug | null) {
  const view = zone ? ZONE_GLOBE_VIEWS[zone] : null;
  const widthFactor = window.innerWidth < window.innerHeight ? 1.5 : 1;
  return Cesium.Cartesian3.fromDegrees(
    view?.lon ?? DEFAULT_LON,
    view?.lat ?? DEFAULT_LAT,
    view ? view.height * widthFactor : DEFAULT_HEIGHT
  );
}

/** Diamètre (pixels) d'un séisme : croît vite avec la magnitude (échelle logarithmique). */
function quakeSize(magnitude: number): number {
  const m = Math.min(Math.max(magnitude, 2.5), 8.5);
  return Math.round(4 + Math.pow(m - 2.5, 1.6) * 1.9);
}

/** Dégradé jaune (M4 et moins) → orange (M5,5) → rouge (M7 et plus). */
function quakeColor(magnitude: number): string {
  const t = Math.min(1, Math.max(0, (magnitude - 4) / 3));
  const hue = Math.round(55 - 55 * t); // 55° = jaune, 0° = rouge
  return `hsl(${hue}, 95%, ${55 - 8 * t}%)`;
}

const PAGER_LABELS: Record<string, string> = {
  green: "Verte (impact limité)",
  yellow: "Jaune (dégâts locaux possibles)",
  orange: "Orange (dégâts importants probables)",
  red: "Rouge (catastrophe probable)",
};

function formatDateTime(value: string | number): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

// Module-level (not a closure inside the component) so the mutation of
// `entity.show` below isn't traced back through dataSourcesRef by the
// hooks linter's effect-purity analysis, which — unlike the sibling
// `source.show = …` one level up — otherwise flags it.
function applyDateFilter(source: CesiumNS.DataSource, dateRange: GlobeDateRange): void {
  for (const entity of source.entities.values) {
    const t = entity.properties?.eventTime?.getValue();
    if (typeof t === "number") {
      // Événement qui dure (feu, inondation…) : visible tant qu'il chevauche la période.
      const end = entity.properties?.eventEnd?.getValue();
      entity.show = t <= dateRange.end && (typeof end === "number" ? end : t) >= dateRange.start;
    }
  }
}

// --- Regroupement des événements (mode « Groupes ») ---------------------------------------------------

/**
 * Mode d'affichage des événements. « Points » : historique (anneau, écart en couronne, un point chacun). « Groupes » : le
 * regroupement de Cesium (EntityCluster) réunit les points voisins à l'écran ; l'anneau est masqué. Changer de mode ne touche
 * jamais à l'ensemble des événements affichés : la visibilité de chaque point (filtre de dates comprise) est conservée, l'anneau
 * suit son point. Cesium ignore les marqueurs masqués et ceux de la face cachée du globe, ils ne sont donc pas comptés dans un
 * groupe. Aucun événement n'est retiré : seul son affichage change.
 */
function applyEventMode(source: CesiumNS.DataSource, mode: EventMode): void {
  // Regroupé : mode « Groupes » et zoom assez large. Au zoom proche, les points redeviennent individuels (écart en couronne et anneau de main).
  const groups = mode === "groups" && !shared.exploded;
  const dotShown = new Map<number, boolean>();
  for (const entity of source.entities.values) {
    if (entity.properties?.ring?.getValue() !== true) dotShown.set(entity.properties?.eventId?.getValue(), entity.show);
  }
  for (const entity of source.entities.values) {
    if (entity.properties?.ring?.getValue() === true) entity.show = !groups && (dotShown.get(entity.properties?.eventId?.getValue()) ?? true);
  }
  const clustering = source.clustering;
  clustering.enabled = groups;
  // Cesium ne recalcule les groupes qu'au mouvement de la caméra : un changement de période ou de mode l'y oblige.
  clustering.pixelRange = CLUSTER_PIXEL_RANGE + 1;
  clustering.pixelRange = CLUSTER_PIXEL_RANGE;
}

/**
 * Où poser le point d'un groupe : sur un lieu réel d'événements, jamais au centre de gravité (que Cesium choisit par défaut et qui
 * tombe entre les villes, dans la Manche ou à côté de Moscou). On retient le lieu qui revient le plus souvent dans le groupe
 * (arrondi à 0,01°, environ 1 km : les événements d'une même ville), et, à égalité, celui qui est le plus proche du centre.
 */
function clusterAnchor(Cesium: typeof CesiumNS, entities: CesiumNS.Entity[]): CesiumNS.Cartesian3 | null {
  const now = Cesium.JulianDate.now();
  const places = new Map<string, { position: CesiumNS.Cartesian3; count: number }>();
  const sum = new Cesium.Cartesian3();
  let total = 0;
  for (const entity of entities) {
    const position = entity.position?.getValue(now);
    if (!position) continue;
    Cesium.Cartesian3.add(sum, position, sum);
    total += 1;
    const key = `${Number(entity.properties?.eventLat?.getValue()).toFixed(2)},${Number(entity.properties?.eventLon?.getValue()).toFixed(2)}`;
    const place = places.get(key);
    if (place) place.count += 1;
    else places.set(key, { position, count: 1 });
  }
  if (total === 0) return null;
  const centre = Cesium.Cartesian3.multiplyByScalar(sum, 1 / total, new Cesium.Cartesian3());
  let best: { position: CesiumNS.Cartesian3; count: number } | null = null;
  for (const place of places.values()) {
    if (!best || place.count > best.count || (place.count === best.count && Cesium.Cartesian3.distanceSquared(place.position, centre) < Cesium.Cartesian3.distanceSquared(best.position, centre))) best = place;
  }
  return best ? best.position : null;
}

const clusterDots = new Map<number, string>();
/** Gros point rouge d'un groupe : le rouge des points d'événements (DOT_COLOR), à la taille voulue, sans chiffre. */
function clusterDotImage(diameter: number): string {
  const cached = clusterDots.get(diameter);
  if (cached) return cached;
  const ratio = 3;
  const size = clusterDotCanvasSize(diameter);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size * ratio;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(ratio, ratio);
  const c = size / 2;
  const r = diameter / 2;
  // Halo discret autour du disque, puis disque plein au bord net avec un léger éclat au centre (comme les points isolés).
  const halo = ctx.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0, `${DOT_COLOR}66`);
  halo.addColorStop(1, `${DOT_COLOR}00`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);
  const disc = ctx.createRadialGradient(c, c, 0, c, c, r);
  disc.addColorStop(0, "#ff8a80");
  disc.addColorStop(1, DOT_COLOR);
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = disc;
  ctx.fill();
  // Adresse de données : Cesium reconnaît la même image d'un groupe à l'autre au lieu d'en téléverser une nouvelle à chaque calcul.
  const url = canvas.toDataURL();
  clusterDots.set(diameter, url);
  return url;
}

const clusterRings = new Map<string, string>();
/** Anneau d'un groupe (style « anneaux ») : liseré rouge net, intérieur presque transparent, petit point plein au centre, second anneau très fin pour les gros groupes. */
function clusterRingImage(count: number): string {
  const diameter = ringDiameter(count);
  const double = count >= RING_DOUBLE_FROM;
  const key = `${diameter}-${double}`;
  const cached = clusterRings.get(key);
  if (cached) return cached;
  const ratio = 3;
  const size = ringCanvasSize(diameter);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size * ratio;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(ratio, ratio);
  const c = size / 2;
  const r = diameter / 2;
  if (double) {
    ctx.beginPath();
    ctx.arc(c, c, r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `${DOT_COLOR}59`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(c, c, r - 1, 0, Math.PI * 2);
  ctx.fillStyle = `${DOT_COLOR}1a`;
  ctx.fill();
  ctx.strokeStyle = DOT_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Point central plein, cerclé de la couleur de fond du site pour rester net sur n'importe quel pays.
  ctx.beginPath();
  ctx.arc(c, c, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = DOT_COLOR;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#0c1726";
  ctx.stroke();
  const url = canvas.toDataURL();
  clusterRings.set(key, url);
  return url;
}

let plainDotCanvas: HTMLCanvasElement | null = null;
/** Point isolé du style « anneaux » : disque plein net, contour sombre d'1 px, sans halo ni reflet (même emprise que glowDot). */
function plainDot(): HTMLCanvasElement {
  if (plainDotCanvas) return plainDotCanvas;
  const canvas = document.createElement("canvas");
  canvas.width = DOT_PX;
  canvas.height = DOT_PX;
  const ctx = canvas.getContext("2d")!;
  const c = DOT_PX / 2;
  ctx.beginPath();
  ctx.arc(c, c, DOT_PX * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = DOT_COLOR;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#0c1726";
  ctx.stroke();
  plainDotCanvas = canvas;
  return canvas;
}

const NATURAL_EVENT_LABELS: Record<NaturalEventCategory, string> = {
  wildfires: "FEU DE FORÊT",
  severeStorms: "TEMPÊTE",
  volcanoes: "VOLCAN",
  floods: "INONDATION",
  droughts: "SÉCHERESSE",
};

/** Finesse des tuiles de la carte sur téléphone (plus petit = plus fin) : à l'arrêt, puis pendant un geste. */
const MOBILE_IDLE_SSE = 1.5;
const MOBILE_MOVING_SSE = 3.5;
/** Attribut posé sur <html> pendant un geste au doigt sur le globe (téléphone) ; le bandeau LATEST s'en sert pour se mettre en pause. */
const GLOBE_MOVING_ATTR = "data-globe-moving";

// --- Points lumineux des événements des analystes ---------------------------------------

/** Rouge des points d'événements (tous de la même couleur, demande de Nicolas, 18/10/2026). */
const DOT_COLOR = "#ff3b30";
const DOT_PX = 64;

let dotCanvas: HTMLCanvasElement | null = null;
/** Point d'événement au repos : disque rouge net (bord franc) avec un petit halo serré, toujours allumé. */
function glowDot(): HTMLCanvasElement {
  if (dotCanvas) return dotCanvas;
  const canvas = document.createElement("canvas");
  canvas.width = DOT_PX;
  canvas.height = DOT_PX;
  const ctx = canvas.getContext("2d")!;
  const c = DOT_PX / 2;
  const discR = DOT_PX * 0.24;
  const halo = ctx.createRadialGradient(c, c, 0, c, c, discR * 1.6);
  halo.addColorStop(0, `${DOT_COLOR}88`);
  halo.addColorStop(1, `${DOT_COLOR}00`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, DOT_PX, DOT_PX);
  // Disque plein au bord net, avec un léger éclat au centre : lisible sur un pays coloré comme sur la mer.
  const disc = ctx.createRadialGradient(c, c, 0, c, c, discR);
  disc.addColorStop(0, "#ff8a80");
  disc.addColorStop(1, DOT_COLOR);
  ctx.beginPath();
  ctx.arc(c, c, discR, 0, Math.PI * 2);
  ctx.fillStyle = disc;
  ctx.fill();
  dotCanvas = canvas;
  return canvas;
}

const RING_PX = 128;
let ringCanvas: HTMLCanvasElement | null = null;
/** Anneau fin et doux, qui s'élargit autour du point (effet radar) : le pic est à 72 % du rayon de l'image. */
function pingRing(): HTMLCanvasElement {
  if (ringCanvas) return ringCanvas;
  const canvas = document.createElement("canvas");
  canvas.width = RING_PX;
  canvas.height = RING_PX;
  const ctx = canvas.getContext("2d")!;
  const c = RING_PX / 2;
  const ring = ctx.createRadialGradient(c, c, 0, c, c, c);
  ring.addColorStop(0, `${DOT_COLOR}00`);
  ring.addColorStop(0.62, `${DOT_COLOR}00`);
  ring.addColorStop(0.72, `${DOT_COLOR}ff`);
  ring.addColorStop(0.86, `${DOT_COLOR}59`);
  ring.addColorStop(1, `${DOT_COLOR}00`);
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, RING_PX, RING_PX);
  ringCanvas = canvas;
  return canvas;
}

/** Durée d'un cycle de l'anneau (s'élargit en s'estompant, puis repart), en millisecondes. */
const PING_MS = 1400;
/** Avancement de l'anneau d'un événement (0 → 1, puis recommence). La phase propre à chaque événement
 *  évite que tous les points ne « battent » ensemble. */
function pingProgress(phase: number): number {
  return (performance.now() / PING_MS + phase) % 1;
}

/**
 * Décalage à l'écran (pixels) de chaque événement : le premier d'un même lieu reste au
 * centre, les suivants se répartissent en couronnes (6 puis 12, 18…) autour de lui.
 */
function eventOffsets(events: { lat: number; lon: number }[], size: number): [number, number][] {
  const seen = new Map<string, number>();
  return events.map((e) => {
    const key = `${e.lat.toFixed(2)},${e.lon.toFixed(2)}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    if (n === 0) return [0, 0];
    // Couronne k (1, 2, …) : 6k places, rayon k × la largeur d'un point.
    let ring = 1;
    let rest = n - 1;
    while (rest >= 6 * ring) {
      rest -= 6 * ring;
      ring += 1;
    }
    const angle = (rest / (6 * ring)) * 2 * Math.PI - Math.PI / 2;
    const radius = ring * size * 0.95;
    return [Math.round(radius * Math.cos(angle)), Math.round(radius * Math.sin(angle))];
  });
}

/** Couleur d'un satellite selon sa fonction. */
function satelliteColor(fn: string): string {
  if (fn.startsWith("Navigation")) return "#35b779";
  if (fn.startsWith("Militaire")) return "#ff5252";
  if (fn.startsWith("Météo")) return "#7fc8e8";
  if (fn.startsWith("Observation")) return "#26c6da";
  if (fn.startsWith("Station")) return "#ffffff";
  if (fn.startsWith("Science") || fn.startsWith("Recherche")) return "#e0b44c";
  return "#b388ff";
}

/** Recherche Wikipédia d'un volcan à partir du titre de l'événement :
 *  « Telica Volcano, Nicaragua » ou « Éruption volcanique Etna — Italie » → « Telica volcan ». */
function volcanoName(title: string): string {
  const name = title
    .replace(/^Éruption volcanique\s*/i, "")
    .replace(/\s+—.*$/, "")
    .replace(/,.*$/, "")
    .replace(/\s+(Volcano|Volcanic Complex|Group)$/i, "")
    .trim();
  return `${name} volcan`;
}

// --- Épingles illustrées (volcans, lancements, inondations, feux, tempêtes, avions) ----

type PinKind = "volcano" | "launch" | "flood" | "wildfire" | "storm" | "aircraft" | "drought";

/** Couleur de l'anneau lumineux de chaque épingle (modèle validé par Nicolas, 18/10/2026). */
const PIN_COLORS: Record<PinKind, string> = {
  volcano: "#ff3b2f",
  launch: "#f5b301",
  flood: "#2f8cff",
  wildfire: "#ff7a1a",
  storm: "#a64dff",
  aircraft: "#2ee66b",
  drought: "#e6a73c",
};

const PIN_OF_CATEGORY: Record<NaturalEventCategory, PinKind> = {
  volcanoes: "volcano",
  floods: "flood",
  wildfires: "wildfire",
  severeStorms: "storm",
  droughts: "drought",
};

const pinPhotos: Partial<Record<PinKind, HTMLImageElement>> = {};

/** Charge les six photos (public/equinoxe/markers) ; une photo manquante laisse l'anneau seul. */
function loadPinPhotos(): Promise<void> {
  return Promise.all(
    (Object.keys(PIN_COLORS) as PinKind[]).map(
      (kind) =>
        new Promise<void>((resolve) => {
          if (pinPhotos[kind]) return resolve();
          const img = new Image();
          img.onload = () => {
            pinPhotos[kind] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `/equinoxe/markers/${kind}.webp`;
        }),
    ),
  ).then(() => undefined);
}

const pinCanvases = new Map<PinKind, HTMLCanvasElement>();

/** Marqueur rond : l'icône de la catégorie (anneau compris, modèle de Nicolas du 18/10/2026)
 *  posée sur un halo lumineux de sa couleur, centrée sur le lieu. */
function pinMarker(kind: PinKind): HTMLCanvasElement {
  const cached = pinCanvases.get(kind);
  if (cached) return cached;
  const W = 192;
  const cx = W / 2;
  const r = 84;
  const color = PIN_COLORS[kind];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = W;
  const ctx = canvas.getContext("2d")!;
  // Halo lumineux sous l'icône.
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#0b1220";
  ctx.beginPath();
  ctx.arc(cx, cx, r - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  const icon = pinPhotos[kind];
  if (icon) {
    // L'icône découpée comprend son anneau : affichée entière, dans un cercle.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(icon, cx - r, cx - r, r * 2, r * 2);
    ctx.restore();
  } else {
    // Icône indisponible : simple anneau coloré.
    ctx.beginPath();
    ctx.arc(cx, cx, r - 6, 0, Math.PI * 2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  pinCanvases.set(kind, canvas);
  return canvas;
}

/** Billboard Cesium d'un rond illustré, de largeur `width` pixels, centré sur le lieu. */
function pinBillboard(Cesium: typeof CesiumNS, kind: PinKind, width: number): CesiumNS.BillboardGraphics.ConstructorOptions {
  return {
    image: pinMarker(kind),
    width: Math.round(width),
    height: Math.round(width),
    verticalOrigin: Cesium.VerticalOrigin.CENTER,
    // Taille selon le zoom : petite vue de loin (globe entier), jusqu'à 2,4 fois plus grande
    // de près (une région, un pays), là où l'on veut voir la photo.
    scaleByDistance: new Cesium.NearFarScalar(4.0e5, 2.4, 1.5e7, 0.85),
  };
}

const ALERT_LABELS: Record<string, string> = {
  green: "Verte (impact limité)",
  orange: "Orange (impact modéré)",
  red: "Rouge (impact grave)",
};

function formatDay(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

const NATURAL_EVENT_LAYER: Record<NaturalEventCategory, LayerKey> = {
  wildfires: "wildfires",
  severeStorms: "storms",
  volcanoes: "volcanoes",
  floods: "floods",
  droughts: "droughts",
};

const CABLES_URL = "/data/submarine-cables.geo.json";
const CABLE_COLOR = "#e0b44c";

// Construit la couche des câbles : un trait fin par tronçon, un clic ouvre la bulle du câble.
// Données : TeleGeography (submarinecablemap.com), licence CC BY-SA 3.0, allégées par
// scripts/gen-submarine-cables.mjs.
async function loadCableSource(Cesium: typeof CesiumNS): Promise<CesiumNS.GeoJsonDataSource> {
  const source = await Cesium.GeoJsonDataSource.load(CABLES_URL, {
    stroke: Cesium.Color.fromCssColorString(CABLE_COLOR).withAlpha(0.85),
    strokeWidth: 1.6,
    clampToGround: false,
    credit: "Câbles sous-marins : TeleGeography (CC BY-SA 3.0)",
  });
  for (const entity of source.entities.values) {
    const name = String(entity.properties?.name?.getValue() ?? "Câble sous-marin");
    const km = Number(entity.properties?.km?.getValue());
    const popup: EntityPopupData = {
      layerKey: "cables",
      badge: "CÂBLE SOUS-MARIN",
      title: name,
      fields: [
        ...(Number.isFinite(km) && km > 0 ? [{ label: "Longueur", value: `≈ ${Math.round(km).toLocaleString("fr-FR")} km` }] : []),
        { label: "Source", value: "TeleGeography · CC BY-SA 3.0" },
      ],
    };
    entity.properties = new Cesium.PropertyBag({ popup: JSON.stringify(popup) });
  }
  return source;
}

// Le globe est long à construire (Viewer, 180 pays, tuiles). On le garde en vie quand on quitte
// l'accueil (Approche, Actualités…) : au retour, il est simplement remis dans la page, sans
// reconstruction. Il est détruit après quelques minutes d'absence (mémoire, surtout sur téléphone)
// ou s'il est trop ancien (données des couches).
interface PersistentGlobe {
  viewer: CesiumNS.Viewer;
  host: HTMLDivElement;
  sources: Partial<Record<LayerKey, CesiumNS.DataSource>>;
  clickHandler: CesiumNS.ScreenSpaceEventHandler | null;
  createdAt: number;
  lowPower: boolean;
}

let persistentGlobe: PersistentGlobe | null = null;
let persistentTimer: number | null = null;

const KEEP_ALIVE_MS = 10 * 60_000;
const KEEP_ALIVE_LOW_POWER_MS = 4 * 60_000;
const MAX_AGE_MS = 40 * 60_000;

function destroyPersistentGlobe() {
  if (persistentTimer !== null) window.clearTimeout(persistentTimer);
  persistentTimer = null;
  const kept = persistentGlobe;
  persistentGlobe = null;
  if (!kept) return;
  try {
    kept.clickHandler?.destroy();
    kept.viewer.destroy();
  } catch {
    // Contexte déjà perdu : rien d'autre à libérer.
  }
  kept.host.remove();
}

// Valeurs partagées avec les gestionnaires du globe conservé : ils sont créés une seule fois,
// mais le composant qui les pilote change à chaque retour sur l'accueil.
const shared: {
  onEntitySelect: Globe3DProps["onEntitySelect"];
  focusZone: ZoneSlug | null;
  onZonePick: Globe3DProps["onZonePick"];
  enabledLayers: Record<LayerKey, boolean> | null;
  nightLights: boolean;
  dayNight: boolean;
  eventMode: EventMode;
  /** Zoom proche : les groupes d'événements sont éclatés en points individuels (voir explodedAtHeight). */
  exploded: boolean;
} = {
  onEntitySelect: () => {},
  focusZone: null,
  onZonePick: () => {},
  enabledLayers: null,
  nightLights: true,
  dayNight: true,
  eventMode: "points",
  exploded: false,
};

interface Globe3DProps {
  countryRisk: Record<string, CountryRisk>;
  enabledLayers: Record<LayerKey, boolean>;
  aircraft: MilitaryAircraft[];
  satellites: SatellitePosition[];
  vessels: VesselPosition[];
  earthquakes: Earthquake[];
  analystEvents: AnalystEvent[];
  naturalEvents: NaturalEvent[];
  launches: Launch[];
  dateRange: GlobeDateRange | null;
  /** Événements des analystes : un point par événement (historique) ou regroupés selon la densité à l'écran. */
  eventMode: EventMode;
  onEntitySelect: (data: EntityPopupData | null, screen: { x: number; y: number } | null) => void;
  /** Zone au centre du globe (null : vue d'ensemble). */
  focusZone: ZoneSlug | null;
  /** Un clic sur un pays d'une zone demande de centrer le globe sur cette zone. */
  onZonePick: (zone: ZoneSlug) => void;
}

export default function Globe3D({
  countryRisk,
  enabledLayers,
  aircraft,
  satellites,
  vessels,
  earthquakes,
  analystEvents,
  naturalEvents,
  launches,
  dateRange,
  eventMode,
  onEntitySelect,
  focusZone,
  onZonePick,
}: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataSourcesRef = useRef<Partial<Record<LayerKey, CesiumNS.DataSource>>>({});
  const viewerRef = useRef<CesiumNS.Viewer | null>(null);
  // Valeurs relues par les gestionnaires du globe (créés une seule fois, voir « shared ») : un
  // nouveau callback du parent ne doit jamais reconstruire le Viewer.
  useEffect(() => {
    shared.onEntitySelect = onEntitySelect;
  }, [onEntitySelect]);
  useEffect(() => {
    shared.eventMode = GLOBE_CLUSTERING_ENABLED ? eventMode : "points";
  }, [eventMode]);
  useEffect(() => {
    shared.focusZone = focusZone;
    shared.onZonePick = onZonePick;
  }, [focusZone, onZonePick]);
  useEffect(() => {
    shared.enabledLayers = enabledLayers;
    shared.nightLights = enabledLayers.nightLights;
    shared.dayNight = enabledLayers.dayNight;
    // Jour / nuit : l'éclairage solaire de Cesium, coupé ou rétabli sans reconstruire le globe.
    const viewer = viewerRef.current;
    if (viewer && !viewer.isDestroyed()) {
      viewer.scene.globe.enableLighting = enabledLayers.dayNight;
      viewer.scene.requestRender();
    }
  }, [enabledLayers]);

  // Heavy one-time setup: the Cesium Viewer itself, the country-risk
  // overlay, and every layer's CustomDataSource. Deliberately does NOT
  // depend on `enabledLayers` — a checkbox toggle must never tear down
  // and rebuild the whole globe (lost camera position, re-downloaded
  // tiles, visible flicker). Toggling is handled entirely by the second
  // effect below, which just flips `.show` on the already-built
  // data sources kept in dataSourcesRef.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let viewer: CesiumNS.Viewer | null = null;
    let host: HTMLDivElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let clickHandler: CesiumNS.ScreenSpaceEventHandler | null = null;
    // Numéro du dernier vol de caméra vers un pays : une bulle n'est ouverte que si aucun clic plus récent n'a eu lieu.
    let countryFlight = 0;
    let removeIntroListeners: () => void = () => {};
    // Vrai tant que l'introduction n'est pas terminée : un globe à moitié « révélé » n'est pas conservé.
    let introPending = false;
    // Renseignés quand la construction est terminée (fin de la fonction asynchrone ci-dessous).
    let builtComplete = false;
    let builtSources: Partial<Record<LayerKey, CesiumNS.DataSource>> = {};
    let builtLowPower = false;

    const keepAlive = (kept: PersistentGlobe) => {
      if (persistentTimer !== null) window.clearTimeout(persistentTimer);
      persistentTimer = window.setTimeout(
        destroyPersistentGlobe,
        kept.lowPower ? KEEP_ALIVE_LOW_POWER_MS : KEEP_ALIVE_MS
      );
    };
    const watchSize = (target: CesiumNS.Viewer) => {
      resizeObserver = new ResizeObserver(() => {
        target.resize();
        target.scene.requestRender();
      });
      resizeObserver.observe(container);
    };

    // Retour sur l'accueil : le globe construit la dernière fois est remis dans la page.
    const introWanted = document.documentElement.getAttribute(INTRO_ATTR) === "loading";
    if (persistentGlobe && (introWanted || Date.now() - persistentGlobe.createdAt > MAX_AGE_MS)) {
      destroyPersistentGlobe();
    }
    if (persistentGlobe && window.Cesium) {
      const kept = persistentGlobe;
      const Cesium = window.Cesium;
      if (persistentTimer !== null) window.clearTimeout(persistentTimer);
      persistentTimer = null;
      container.appendChild(kept.host);
      viewerRef.current = kept.viewer;
      dataSourcesRef.current = kept.sources;
      // Caméra : sur la zone demandée par l'adresse (?zone=…), sinon vue d'ensemble.
      const asked = new URLSearchParams(window.location.search).get("zone");
      kept.viewer.camera.cancelFlight();
      kept.viewer.camera.setView({
        destination: zoneCameraDestination(Cesium, asked && isHomeZone(asked) ? asked : null),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      });
      watchSize(kept.viewer);
      requestAnimationFrame(() => {
        kept.viewer.resize();
        kept.viewer.scene.requestRender();
      });
      return () => {
        resizeObserver?.disconnect();
        viewerRef.current = null;
        dataSourcesRef.current = {};
        if (persistentGlobe === kept) {
          kept.host.remove();
          keepAlive(kept);
        }
      };
    }

    loadCesium().then(async (Cesium) => {
      if (disposed) return;

      host = document.createElement("div");
      host.style.cssText = "width:100%;height:100%";
      container.appendChild(host);

      viewer = new Cesium.Viewer(host, {
        // No baseLayer here — added explicitly right after construction
        // via imageryLayers.addImageryProvider instead, so its readiness
        // isn't tied to Viewer construction timing.
        baseLayer: false,
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        // Both replaced by a custom click-to-popup below (GlobeEntityPopup,
        // wired through onEntitySelect) — Cesium's defaults are a large
        // sidebar panel and a green corner-bracket highlight, neither
        // matching the small floating "bulle" this site wants.
        infoBox: false,
        selectionIndicator: false,
        // A single bad geometry (see the renderError handler below) must
        // not show Cesium's big built-in error panel over the whole globe.
        showRenderLoopErrors: false,
      });
      viewerRef.current = viewer;
      // Écran de chargement de l'accueil : le moteur est prêt, il reste les tuiles de la carte.
      if (document.documentElement.getAttribute(INTRO_ATTR) === "loading") {
        window.dispatchEvent(new Event(INTRO_EVENTS.engine));
      }

      // By default, ANY render-loop error (e.g. one pathological polygon
      // out of ~180 countries throwing during async geometry building —
      // observed on this exact GeoJSON, with pristine unminified Cesium,
      // so it's a genuine Cesium edge case, not our bug) permanently
      // halts rendering for the whole globe by setting
      // useDefaultRenderLoop = false. Logging and immediately flipping it
      // back on means one broken entity just fails to draw instead of
      // blanking the entire globe.
      viewer.scene.renderError.addEventListener((_scene, error) => {
        console.error("Cesium render error (recovered, rendering resumed):", error);
        if (viewer) viewer.useDefaultRenderLoop = true;
      });

      // Click-to-popup: every layer's entities carry their info as a
      // JSON string on `properties.popup` (see the layer-building code
      // below) rather than Cesium's HTML `description`, since we're
      // rendering our own React bubble (GlobeEntityPopup) instead of the
      // disabled default InfoBox.
      //
      // Anchoring: the bubble is placed at the raw click position
      // (`click.position`, already in the same window/CSS pixel space
      // Cesium uses for picking) rather than re-projecting the entity's
      // own `.position` back to screen space — polygon entities (the
      // country-risk fill) don't have a `.position` at all, which made
      // country clicks silently fail to open a bubble, and for point
      // entities the round-trip was redundant with where the user
      // already clicked.
      //
      // Hit tolerance: point markers (aircraft/vessels/quakes/…) are
      // only a few pixels wide, so a click that's a couple of pixels off
      // falls straight through to whatever's underneath — almost always
      // the country-risk polygon, which covers the entire country and
      // was being reported instead ("wrong category"). pickPointNear
      // below widens the effective hit target for point entities by
      // sampling a small ring of nearby pixels before accepting a
      // polygon hit.
      // Un groupe d'événements (EntityCluster) : le marqueur pické porte la liste de ses entités.
      function clusterOf(picked: unknown): CesiumNS.Entity[] | null {
        const id = Cesium.defined(picked) ? (picked as { id?: unknown }).id : null;
        if (!Array.isArray(id)) return null;
        const entities = id.filter((e): e is CesiumNS.Entity => e instanceof Cesium.Entity);
        return entities.length > 0 ? entities : null;
      }

      function pickPointNear(position: CesiumNS.Cartesian2): CesiumNS.Entity | CesiumNS.Entity[] | null {
        const currentViewer = viewer;
        if (!currentViewer) return null;
        const direct = currentViewer.scene.pick(position);
        const directCluster = clusterOf(direct);
        if (directCluster) return directCluster;
        const directEntity =
          Cesium.defined(direct) && direct.id instanceof Cesium.Entity ? direct.id : null;
        // Marqueurs illustrés (points d'articles, icônes) : des billboards, prioritaires eux aussi.
        const isMarker = (e: CesiumNS.Entity | null) => Boolean(e?.point || e?.polyline || e?.billboard);
        if (isMarker(directEntity)) return directEntity;

        // Au doigt (téléphone), le tap tombe souvent à côté du marqueur : cercle de recherche plus large.
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        const RADII = coarse ? [6, 12, 18, 26] : [5, 9, 13];
        const SAMPLES_PER_RING = 8;
        for (const radius of RADII) {
          for (let i = 0; i < SAMPLES_PER_RING; i++) {
            const angle = (i / SAMPLES_PER_RING) * Math.PI * 2;
            const sample = new Cesium.Cartesian2(
              position.x + Math.cos(angle) * radius,
              position.y + Math.sin(angle) * radius
            );
            const picked = currentViewer.scene.pick(sample);
            const sampledCluster = clusterOf(picked);
            if (sampledCluster) return sampledCluster;
            const entity = Cesium.defined(picked) && picked.id instanceof Cesium.Entity ? picked.id : null;
            if (isMarker(entity)) return entity;
          }
        }

        return directEntity;
      }

      // Clic sur un groupe : la caméra s'approche de ses membres (clics successifs pour descendre). Quand tous les événements
      // sont au même lieu, zoomer ne les séparera jamais : leur liste s'ouvre, chacun ouvre ensuite sa fiche habituelle.
      function openCluster(entities: CesiumNS.Entity[], position: CesiumNS.Cartesian2) {
        const currentViewer = viewer;
        if (!currentViewer || currentViewer.isDestroyed()) return;
        const events: { id: number; lat: number; lon: number; popup: EntityPopupData }[] = [];
        for (const entity of entities) {
          const id = entity.properties?.eventId?.getValue();
          const raw = entity.properties?.popup?.getValue();
          if (typeof id !== "number" || typeof raw !== "string" || events.some((e) => e.id === id)) continue;
          try {
            events.push({ id, lat: Number(entity.properties?.eventLat?.getValue()), lon: Number(entity.properties?.eventLon?.getValue()), popup: JSON.parse(raw) as EntityPopupData });
          } catch (err) {
            console.error("Malformed entity popup payload:", err);
          }
        }
        if (events.length === 0) return;
        shared.onEntitySelect(null, null);
        if (isColocated(events)) {
          const where = events[0].popup.fields.find((f) => f.label === "Lieu")?.value.replace(" (national)", "");
          const items = events
            .map((e) => e.popup)
            .sort((a, b) => Date.parse(b.brief?.publishedAt ?? "") - Date.parse(a.brief?.publishedAt ?? ""));
          shared.onEntitySelect(
            { layerKey: "events", badge: "ÉVÉNEMENTS", title: `${items.length} événements au même endroit`, fields: where ? [{ label: "Lieu", value: where }] : [], items },
            { x: position.x, y: position.y },
          );
          return;
        }
        const now = Cesium.JulianDate.now();
        const points = entities.map((e) => e.position?.getValue(now)).filter((p): p is CesiumNS.Cartesian3 => Cesium.defined(p));
        if (points.length === 0) return;
        const sphere = Cesium.BoundingSphere.fromPoints(points);
        currentViewer.camera.flyToBoundingSphere(sphere, {
          duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.9,
          offset: new Cesium.HeadingPitchRange(currentViewer.camera.heading, -Math.PI / 2, Math.max(sphere.radius * 2.8, 15_000)),
        });
      }

      clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      clickHandler.setInputAction((click: CesiumNS.ScreenSpaceEventHandler.PositionedEvent) => {
        const hit = pickPointNear(click.position);
        if (Array.isArray(hit)) {
          openCluster(hit, click.position);
          return;
        }
        const entity = hit;
        const raw = entity?.properties?.popup?.getValue();
        if (entity && typeof raw === "string") {
          try {
            const data = JSON.parse(raw) as EntityPopupData;
            // Un pays : le globe se centre dessus, puis la bulle s'ouvre au-dessus de son centre
            // (la position écran de la bulle est celle d'après le vol, pas celle du clic).
            const hierarchy = data.layerKey === "risk" ? (entity.polygon?.hierarchy?.getValue(Cesium.JulianDate.now()) as CesiumNS.PolygonHierarchy | undefined) : undefined;
            const currentViewer = viewer;
            if (hierarchy && currentViewer && !currentViewer.isDestroyed()) {
              const sphere = Cesium.BoundingSphere.fromPoints(hierarchy.positions);
              const flight = ++countryFlight;
              shared.onEntitySelect(null, null);
              currentViewer.camera.flyToBoundingSphere(sphere, {
                duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.9,
                offset: new Cesium.HeadingPitchRange(currentViewer.camera.heading, -Math.PI / 2, Math.max(sphere.radius * 5.5, 1_600_000)),
                complete: () => {
                  // Un autre clic a relancé un vol, ou le globe a été fermé : cette bulle est périmée.
                  if (flight !== countryFlight || disposed || currentViewer.isDestroyed()) return;
                  const surface = Cesium.Ellipsoid.WGS84.scaleToGeodeticSurface(sphere.center, new Cesium.Cartesian3()) ?? sphere.center;
                  const screen = Cesium.SceneTransforms.worldToWindowCoordinates(currentViewer.scene, surface);
                  shared.onEntitySelect(data, screen ? { x: screen.x, y: screen.y } : { x: click.position.x, y: click.position.y });
                },
              });
              return;
            }
            shared.onEntitySelect(data, { x: click.position.x, y: click.position.y });
            return;
          } catch (err) {
            console.error("Malformed entity popup payload:", err);
          }
        }
        shared.onEntitySelect(null, null);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // Survol d'un groupe (souris seulement) : info-bulle « N événements — Cliquer pour explorer » et curseur main.
      const clusterTip = document.createElement("div");
      clusterTip.className = styles.clusterTip;
      clusterTip.hidden = true;
      viewer.container.appendChild(clusterTip);
      const hideClusterTip = () => {
        clusterTip.hidden = true;
        if (viewer && !viewer.isDestroyed()) viewer.canvas.style.cursor = "";
      };
      viewer.canvas.addEventListener("mouseleave", hideClusterTip);
      let lastHoverAt = 0;
      clickHandler.setInputAction((move: CesiumNS.ScreenSpaceEventHandler.MotionEvent) => {
        const currentViewer = viewer;
        if (!currentViewer || currentViewer.isDestroyed()) return;
        if (shared.eventMode !== "groups" || !shared.enabledLayers?.events || window.matchMedia("(pointer: coarse)").matches) {
          if (!clusterTip.hidden) hideClusterTip();
          return;
        }
        const now = performance.now();
        if (now - lastHoverAt < 70) return;
        lastHoverAt = now;
        const cluster = clusterOf(currentViewer.scene.pick(move.endPosition));
        if (!cluster) {
          if (!clusterTip.hidden) hideClusterTip();
          return;
        }
        const count = distinctIds(cluster.map((e) => e.properties?.eventId?.getValue())).length;
        clusterTip.textContent = `${count} événement${count > 1 ? "s" : ""} — Cliquer pour explorer`;
        clusterTip.style.left = `${move.endPosition.x + 14}px`;
        clusterTip.style.top = `${move.endPosition.y + 14}px`;
        clusterTip.hidden = false;
        currentViewer.canvas.style.cursor = "pointer";
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      // Introduction de l'accueil : le script de démarrage (lib/homeIntro.ts) pose
      // data-home-intro="loading" avant l'affichage. Le globe démarre alors « neutre » :
      // ni frontières ni noms, ni couleurs de risque, et la caméra loin de la Terre.
      const introMode = document.documentElement.getAttribute(INTRO_ATTR) === "loading";
      introPending = introMode;

      // Performances. Appareil tactile ou écran étroit : on allège le rendu (pas d'anticrénelage
      // multi-échantillons, tuiles un peu moins fines, 30 images par seconde, une seule couche de
      // lumières). Partout : le globe ne se redessine que lorsque quelque chose change (caméra,
      // tuiles, couches) au lieu de tourner à vide 60 fois par seconde, ce qui libérait mal le
      // processeur — le bandeau LATEST et le défilement de la page en souffraient.
      const lowPower = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
      viewer.scene.requestRenderMode = true;
      viewer.scene.maximumRenderTimeChange = Infinity;
      if (lowPower) {
        viewer.targetFrameRate = 30;
        viewer.scene.msaaSamples = 1;
        viewer.scene.fog.enabled = false;
        viewer.scene.postProcessStages.fxaa.enabled = false;
        // Sur téléphone la page fait 980 px de large (voir app/layout.tsx). Le globe était dessiné à 65 % de cette
        // largeur puis étiré par le navigateur : image floue. Désormais : résolution native de l'écran (devicePixelRatio,
        // plafonnée à 1,5 pour épargner la batterie) quand le globe est immobile, et définition allégée (70 %, tuiles
        // moins fines) pendant les gestes, rétablie 0,2 s après leur fin. Le coût n'est payé qu'à l'arrêt.
        viewer.useBrowserRecommendedResolution = false;
        const nativeRatio = window.devicePixelRatio || 1;
        const idleRatio = Math.min(nativeRatio, 1.5);
        const idleScale = idleRatio / nativeRatio;
        // Pendant un geste : 60 % de la définition d'arrêt (au lieu de 70 %), rétablie 0,2 s après. Le flou ne dure que le temps du geste.
        const movingScale = (idleRatio * 0.6) / nativeRatio;
        viewer.resolutionScale = idleScale;
        const qualityViewer = viewer;
        let sharpenTimer: number | undefined;
        const setQuality = (idle: boolean) => {
          if (qualityViewer.isDestroyed()) return;
          qualityViewer.resolutionScale = idle ? idleScale : movingScale;
          qualityViewer.scene.globe.maximumScreenSpaceError = idle ? MOBILE_IDLE_SSE : MOBILE_MOVING_SSE;
          qualityViewer.scene.requestRender();
        };
        // Le bandeau LATEST fait une pause tant qu'un doigt est posé sur le globe (voir Ticker.module.css), puis repart tout de suite. La pause
        // suit le doigt (pointerdown / pointerup), jamais les événements de caméra : un événement de fin manqué ne peut donc pas la figer.
        // Garde-fou : elle s'arrête d'elle-même au bout de 4 s, et dès que la page est masquée.
        const gestureCanvas = viewer.scene.canvas;
        let pauseGuard: number | undefined;
        const releaseTicker = () => {
          window.clearTimeout(pauseGuard);
          document.documentElement.removeAttribute(GLOBE_MOVING_ATTR);
        };
        gestureCanvas.addEventListener("pointerdown", () => {
          document.documentElement.setAttribute(GLOBE_MOVING_ATTR, "1");
          window.clearTimeout(pauseGuard);
          pauseGuard = window.setTimeout(releaseTicker, 4000);
        });
        for (const type of ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"]) gestureCanvas.addEventListener(type, releaseTicker);
        document.addEventListener("visibilitychange", releaseTicker);
        qualityViewer.camera.moveStart.addEventListener(() => {
          window.clearTimeout(sharpenTimer);
          setQuality(false);
        });
        qualityViewer.camera.moveEnd.addEventListener(() => {
          window.clearTimeout(sharpenTimer);
          sharpenTimer = window.setTimeout(() => setQuality(true), 200);
        });
      }

      const baseLayer = viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({ url: IMAGERY_URL, credit: IMAGERY_CREDIT })
      );
      // Côté nuit, le relief reste à peine deviné : les lumières des villes ressortent.
      baseLayer.nightAlpha = BASE_NIGHT_ALPHA;
      // Derrière une imagerie translucide, Cesium montre sa couleur de fond (bleu vif par défaut) :
      // un noir bleuté garde la nuit sombre.
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#02050c");
      // Lumières des villes (NASA, extraites par scripts/gen-night-lights.mjs), côté nuit
      // seulement grâce à l'éclairage activé plus bas : une couche avec halo, lisible quand
      // le globe est vu en entier, et une couche au cœur net pour les vues rapprochées. Un
      // défaut de chargement ne doit jamais empêcher le globe de s'afficher.
      const addLights = (url: string) =>
        Cesium.SingleTileImageryProvider.fromUrl(url, { rectangle: Cesium.Rectangle.MAX_VALUE }).then((provider) => {
          if (disposed || !viewer) return null;
          const layer = viewer.imageryLayers.addImageryProvider(provider, 1);
          layer.dayAlpha = 0;
          layer.nightAlpha = 1;
          viewer.scene.requestRender();
          return layer;
        });
      let haloLayer: CesiumNS.ImageryLayer | null = null;
      let coreLayer: CesiumNS.ImageryLayer | null = null;
      addLights("/cinematic/earth-lights.webp")
        .then((layer) => {
          haloLayer = layer;
        })
        .catch((err) => console.warn("Lumières des villes indisponibles :", err));
      // Téléphone : la couche au cœur net est omise (une couche d'image en moins à mélanger).
      if (!lowPower) {
        addLights("/cinematic/earth-lights-core.webp")
          .then((layer) => {
            coreLayer = layer;
          })
          .catch((err) => console.warn("Lumières des villes indisponibles :", err));
      }
      // Le halo s'efface en s'approchant (il deviendrait de grosses taches) et le relief de la
      // nuit se révèle un peu plus : de près, on lit la carte ; de loin, on voit les villes briller.
      const smoothstep = (a: number, b: number, x: number) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
      };
      viewer.scene.preRender.addEventListener(() => {
        if (!viewer) return;
        const far = smoothstep(5.0e6, 1.4e7, viewer.camera.positionCartographic.height);
        baseLayer.nightAlpha = 0.42 + (BASE_NIGHT_ALPHA - 0.42) * far;
        const lightsOn = shared.nightLights;
        if (haloLayer) {
          haloLayer.show = lightsOn;
          // Sans couche au cœur net (téléphone), le halo reste visible un peu plus près.
          haloLayer.nightAlpha = lowPower ? 0.35 + 0.65 * far : far;
        }
        if (coreLayer) {
          coreLayer.show = lightsOn;
          // De près, des points discrets : la carte reste lisible.
          coreLayer.nightAlpha = 0.4 + 0.3 * far;
        }
      });
      // Added on top: transparent borders + place/capital labels.
      const boundariesLayer = viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({ url: BOUNDARIES_URL, credit: IMAGERY_CREDIT })
      );
      if (introMode) boundariesLayer.show = false;

      // Day/night shading — the sun-relative lighting that gives the
      // globe a more dramatic, "real satellite" look (matches paraxis.app).
      // L'introduction se joue toujours de nuit ; ensuite, le réglage « Jour / nuit » décide.
      viewer.scene.globe.enableLighting = introMode || shared.dayNight;
      // Réglages de la nuit de Cesium (par défaut : éclairage 1e7 → 2e7 m, nuit 1e7 → 5e7 m) :
      //  - éclairage : plein au-delà de lightingFadeInDistance, absent en dessous de
      //    lightingFadeOutDistance (de près, tout est éclairé, on lit la carte) ;
      //  - couche de nuit (lumières des villes) : visible tant que la caméra est plus proche que
      //    nightFadeOutDistance, puis s'efface jusqu'à nightFadeInDistance. Par défaut, les
      //    lumières seraient presque invisibles sur la vue d'accueil (17 000 km).
      viewer.scene.globe.nightFadeOutDistance = 1.0e8;
      viewer.scene.globe.nightFadeInDistance = 2.0e8;
      if (introMode) {
        // Introduction : nuit franche (limite jour/nuit bien marquée) ; elle s'adoucit à l'arrivée.
        viewer.scene.globe.lightingFadeOutDistance = LIGHTING_INTRO.out;
        viewer.scene.globe.lightingFadeInDistance = LIGHTING_INTRO.in;
      }
      viewer.scene.backgroundColor = Cesium.Color.BLACK;

      // Cesium's default (2) is tuned for a camera looking roughly
      // straight down at moderate altitude — fine for whatever's directly
      // under the camera, but at this globe's wide default framing
      // (~14,000km up), land near the edge of the visible disc is both
      // much farther from the camera and seen at a grazing angle, so the
      // same threshold settles for a visibly blurrier/lower tile there
      // than at the center (reported: Middle East looked washed out next
      // to sharp Sahel/Africa in the same frame). Tightening it makes
      // Cesium request higher-detail tiles everywhere, including toward
      // the limb, closing that gap — at the cost of more tile requests.
      viewer.scene.globe.maximumScreenSpaceError = lowPower ? MOBILE_IDLE_SSE : 1;

      // Centered on the Sahel/Africa — the site's editorial focus —
      // rather than Cesium's generic flyHome() default view (which
      // opens over the Americas/Atlantic, unrelated to this site).
      viewer.camera.setView({
        destination: introMode
          ? Cesium.Cartesian3.fromDegrees(INTRO_START_LON, INTRO_START_LAT, INTRO_START_HEIGHT)
          : zoneCameraDestination(Cesium, shared.focusZone),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      });

      // Country risk overlay — GeoJSON + ISO3 lookup. GeoJsonDataSource
      // sets each Entity's id from the feature's top-level `id` when
      // present, which is exactly the ISO3 code here (see
      // public/data/world-countries.geo.json), so no extra mapping is
      // needed to look up countryRisk[entity.id].
      // Fill only, no stroke/outline: Cesium's outline geometry runs
      // rhumb-line subdivision on each polygon's boundary, which throws
      // "Too many properties to enumerate" on some of these country
      // shapes (large vertex counts / antimeridian-spanning rings, e.g.
      // Russia, Antarctica). Filled polygons alone don't hit that path.
      // Téléphone : les 180 contours de pays (calcul lourd) attendent que les premières tuiles
      // de la carte soient affichées, ou 2,5 s au plus, pour que le globe apparaisse plus vite.
      // Pendant l'introduction, rien n'est retardé : elle attend de toute façon cette étape.
      if (lowPower && !introMode) {
        const v = viewer;
        await new Promise<void>((resolve) => {
          let off: (() => void) | null = null;
          const timer = window.setTimeout(done, 2500);
          function done() {
            window.clearTimeout(timer);
            off?.();
            resolve();
          }
          off = v.scene.globe.tileLoadProgressEvent.addEventListener((pending: number) => {
            if (pending === 0) done();
          });
        });
        if (disposed) return;
      }

      // Photos des épingles (volcans, lancements, inondations, feux, tempêtes, avions) : six
      // petites images locales, chargées avant de construire les couches.
      await loadPinPhotos();
      if (disposed) return;

      const countryDataSource = await Cesium.GeoJsonDataSource.load(
        "/data/world-countries.geo.json",
        { fill: Cesium.Color.WHITE.withAlpha(0.05) }
      );
      if (disposed) return;

      // Antarctica's and Russia's antimeridian-spanning rings are known
      // (measured directly against this exact GeoJSON) to crash Cesium's
      // edge-subdivision worker with "Too many properties to enumerate"
      // when filled — confirmed with pristine, unminified Cesium loaded
      // straight from the CDN, so it's a genuine Cesium edge case on
      // this data, not a bundler artifact. Dropping the fill just for
      // large-vertex-count rings avoids building that doomed geometry at
      // all; the renderError handler above is the general safety net for
      // anything this specific heuristic doesn't catch.
      // Russia's main ring (447 vertices, 153° of longitude) used to be dropped by
      // this rule, leaving the country uncoloured and unclickable. Lightening it did
      // not help (Cesium triangulates such a wide polygon badly and draws a big
      // crescent across the country), so the GeoJSON now carries it as four narrow
      // longitude bands with the same country code (scripts/split-world-polygons.ts,
      // lib/clipRing.ts, tests/clip-ring.test.ts). Only Antarctica is still dropped.
      const MAX_SAFE_VERTICES = 300;
      function countVertices(hierarchy: CesiumNS.PolygonHierarchy): number {
        return (
          hierarchy.positions.length +
          (hierarchy.holes ?? []).reduce((sum, hole) => sum + countVertices(hole), 0)
        );
      }

      // Collected separately and removed after the loop rather than
      // during it — mutating an EntityCollection while iterating its
      // live `.values` is unsafe.
      const oversizedEntities: CesiumNS.Entity[] = [];

      for (const entity of countryDataSource.entities.values) {
        if (!entity.polygon) continue;
        const hierarchy = entity.polygon.hierarchy?.getValue(Cesium.JulianDate.now()) as
          | CesiumNS.PolygonHierarchy
          | undefined;
        if (hierarchy && countVertices(hierarchy) > MAX_SAFE_VERTICES) {
          oversizedEntities.push(entity);
          continue;
        }

        // Un pays en plusieurs morceaux (France, Royaume-Uni, Italie, Japon…) : les polygones suivants ont un identifiant suffixé (« FRA_2 »).
        const iso3 = countryCodeOfEntityId(entity.id);
        const risk = countryRisk[iso3];
        const color = risk
          ? Cesium.Color.fromCssColorString(RISK_COLORS[risk.tier]).withAlpha(0.28)
          : Cesium.Color.WHITE.withAlpha(0.05);

        entity.polygon.material = new Cesium.ColorMaterialProperty(color);
        entity.polygon.outline = new Cesium.ConstantProperty(false);

        const info = globeCountryInfo(iso3, String(entity.properties?.name?.getValue() ?? iso3));
        // Bulle d'un pays : nom français, drapeau, niveau, nombre d'articles de la période (calculé à l'ouverture, voir
        // GlobeWithLayers) et lien vers la fiche Approche.
        const popup: EntityPopupData = {
          layerKey: "risk",
          badge: risk ? "PAYS EN CRISE" : "PAYS",
          title: info.name,
          fields: [],
          flagIso2: info.iso2 ?? undefined,
          country: { iso3, tier: risk?.tier ?? null, href: info.href },
        };
        // Overwrites the PropertyBag the GeoJSON loader already built for
        // this entity (feature properties like `name`) — fine here since
        // nothing else reads those beyond the `name` lookup just above.
        entity.properties = new Cesium.PropertyBag({ popup: JSON.stringify(popup) });
      }

      // Fully remove (not just hide) — leaving the default filled
      // polygon in place is exactly what crashes the geometry worker.
      for (const entity of oversizedEntities) {
        countryDataSource.entities.remove(entity);
      }

      // --- Optional data layers, one DataSource each ------------------
      // All built up front and added to the viewer immediately (hidden
      // unless already enabled); the second effect just flips `.show`.
      // The country-risk overlay is included here too (key "risk") so it
      // can be toggled off the same way as every other layer.
      const layerSources: Partial<Record<LayerKey, CesiumNS.DataSource>> = {
        risk: countryDataSource,
      };

      const aircraftSource = new Cesium.CustomDataSource("aircraft");
      for (const a of aircraft) {
        const popup: EntityPopupData = {
          layerKey: "aircraft",
          badge: "AVION MILITAIRE",
          title: a.callsign ?? a.registration ?? a.hex,
          fields: [
            { label: "Appareil", value: a.description ?? a.type ?? "Inconnu" },
            ...(a.operator ? [{ label: "Opérateur", value: a.operator }] : []),
            { label: "Immatriculation", value: a.registration ?? "Inconnue" },
            {
              label: "Altitude",
              // L'ADS-B donne des pieds : affichés en mètres, avec la valeur d'origine.
              value: a.altitude != null ? `${Math.round(a.altitude * 0.3048).toLocaleString("fr-FR")} m (${Math.round(a.altitude).toLocaleString("fr-FR")} ft)` : "Au sol ou inconnue",
            },
            ...(a.speed != null ? [{ label: "Vitesse", value: `${Math.round(a.speed * 1.852)} km/h` }] : []),
            ...(a.heading != null ? [{ label: "Cap", value: `${Math.round(a.heading)}°` }] : []),
            ...(a.squawk ? [{ label: "Transpondeur", value: a.squawk }] : []),
            { label: "Code ICAO", value: a.hex.toUpperCase() },
          ],
          links: [{ label: "Suivre sur ADS-B Exchange →", href: `https://globe.adsbexchange.com/?icao=${a.hex}` }],
        };
        aircraftSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(a.lon, a.lat, (a.altitude ?? 0) * 0.3048),
          billboard: pinBillboard(Cesium, "aircraft", 30),
          properties: { popup: JSON.stringify(popup) },
        });
      }
      layerSources.aircraft = aircraftSource;

      const vesselSource = new Cesium.CustomDataSource("vessels");
      for (const v of vessels) {
        const popup: EntityPopupData = {
          layerKey: "vessels",
          badge: "NAVIRE",
          title: v.ship_name ?? `MMSI ${v.mmsi}`,
          fields: [
            { label: "MMSI", value: v.mmsi },
            { label: "Vitesse", value: v.speed != null ? `${v.speed.toFixed(1)} nds` : "Inconnue" },
            { label: "Cap", value: v.course != null ? `${Math.round(v.course)}°` : "Inconnu" },
            { label: "Région", value: v.region },
            { label: "Mise à jour", value: formatDateTime(v.updated_at) },
          ],
        };
        vesselSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(v.longitude, v.latitude, 0),
          point: {
            pixelSize: 5,
            color: Cesium.Color.fromCssColorString("#42a5f5"),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
          properties: { popup: JSON.stringify(popup) },
        });
      }
      layerSources.vessels = vesselSource;

      // Événements des analystes : point rouge net et fixe, avec un anneau qui s'élargit en s'estompant ; plusieurs événements au
      // même endroit (une capitale, souvent) sont écartés en couronne autour du point. Mode « Groupes » : à partir de 5 événements
      // voisins à l'écran, le regroupement de Cesium les remplace par un gros point rouge (taille par paliers, voir
      // clusterDotDiameter) qui éclate en petits points en zoomant ; les groupes de moins de 5 gardent leurs points, comme avant.
      // L'anneau animé est masqué en mode « Groupes » (voir applyEventMode).
      const eventSource = new Cesium.CustomDataSource("events");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const EVENT_DOT = 22;
      // Style des points : « anneaux » (essai, par défaut sur cette branche) ou « disques » (ancien, ?points=disques).
      const ringStyle = pointStyleFromSearch(window.location.search) === "anneaux";
      // Clignotement lent : ordinateur seulement. Sur téléphone il obligerait à redessiner tout le globe en continu (batterie, bandeau
      // LATEST saccadé, gestes au doigt lents) : les points y restent fixes et nets.
      const blinkOn = ringStyle && !reduceMotion && !window.matchMedia("(pointer: coarse)").matches;
      const spreadOffsets = eventOffsets(analystEvents, EVENT_DOT * 0.6);
      for (const [index, ev] of analystEvents.entries()) {
        const where = [ev.place, ev.country].filter(Boolean).join(", ");
        const popup: EntityPopupData = {
          layerKey: "events",
          badge: ev.importance === "high" ? "ÉVÉNEMENT MAJEUR" : "ÉVÉNEMENT",
          title: ev.title,
          fields: [
            ...(where ? [{ label: "Lieu", value: ev.precision === "capitale" ? `${where} (national)` : where }] : []),
            { label: "Publié", value: formatDateTime(ev.publishedAt) },
            ...(ev.confidenceLabel
              ? [{ label: "Confiance", value: `${ev.confidenceLabel}${ev.confidence != null ? ` (${ev.confidence} %)` : ""}${ev.claimedBy ? ` — revendiqué par ${ev.claimedBy}` : ""}`, dotColor: confidenceColor(ev.confidenceLabel) }]
              : []),
          ],
          href: `/briefs/${ev.id}`,
          brief: { zone: ev.zone, id: ev.id, title: ev.title, imageUrl: ev.imageUrl ?? null, publishedAt: ev.publishedAt, veracity: ev.confidenceLabel },
        };
        const [dx, dy] = spreadOffsets[index];
        const pixelOffset = new Cesium.Cartesian2(dx, dy);
        // Phase propre à chaque événement (tirée de son numéro) : les anneaux ne partent pas tous ensemble.
        const phase = ((ev.id * 0.618034) % 1 + 1) % 1;
        const size = ev.importance === "high" ? EVENT_DOT * 1.25 : EVENT_DOT;
        // eventId, eventLat et eventLon : le point et son anneau portent le même événement, un groupe le compte une seule fois.
        const properties = { popup: JSON.stringify(popup), eventTime: Date.parse(ev.publishedAt), eventId: ev.id, eventLat: ev.lat, eventLon: ev.lon };
        // Anneau qui s'élargit en s'estompant autour du point (coupé si les animations sont réduites).
        // Il porte les mêmes informations que le point : un clic sur l'anneau ouvre la même bulle,
        // et le filtre de dates le masque avec lui. Masqué en mode « Groupes ».
        eventSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(ev.lon, ev.lat, 0),
          billboard: {
            image: pingRing(),
            width: size * 3.2,
            height: size * 3.2,
            // Article survolé dans le bandeau : anneau plus marqué et partant du point agrandi.
            color: new Cesium.CallbackProperty(() => {
              if (reduceMotion) return Cesium.Color.WHITE.withAlpha(0);
              const hovered = getHoveredBrief() === ev.id;
              return Cesium.Color.WHITE.withAlpha((1 - pingProgress(phase)) * (hovered ? 0.9 : 0.5));
            }, false),
            scale: new Cesium.CallbackProperty(
              () => (0.3 + 0.5 * pingProgress(phase)) * (getHoveredBrief() === ev.id ? 2.6 : 1),
              false,
            ),
            pixelOffset,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            eyeOffset: new Cesium.Cartesian3(0, 0, -49),
          },
          properties: { ...properties, ring: true },
        });
        eventSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(ev.lon, ev.lat, 0),
          billboard: {
            image: ringStyle ? plainDot() : glowDot(),
            // Style « anneaux » : clignotement lent de chaque point (phase propre), plein feu quand son article est survolé.
            ...(blinkOn
              ? {
                  color: new Cesium.CallbackProperty(() => Cesium.Color.WHITE.withAlpha(getHoveredBrief() === ev.id ? 1 : blinkLevel(performance.now(), phase)), false),
                }
              : {}),
            width: size,
            height: size,
            // Article survolé dans le bandeau : point plus gros.
            scale: new Cesium.CallbackProperty(() => (getHoveredBrief() === ev.id ? 2.6 : 1), false),
            // Décalage en pixels d'écran : la couronne garde le même écart à tous les zooms.
            pixelOffset,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            // Toujours lisible au-dessus des pays colorés, même au bord du globe ; le point passe devant son anneau.
            eyeOffset: new Cesium.Cartesian3(0, 0, -50),
          },
          properties,
        });
      }
      // Regroupement natif de Cesium, en espace écran (désactivé tant que le mode « Groupes » n'est pas choisi).
      if (GLOBE_CLUSTERING_ENABLED) {
        // Le globe ne se redessine que sur demande : les disques de groupes chargent leur image après leur création.
        let refreshTimer: number | undefined;
        const refreshSoon = () => {
          window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => {
            if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender();
          }, 150);
        };
        // Style « anneaux » : les groupes clignotent aussi, plus doucement (l'anneau reste lisible). Leurs marqueurs sont recréés à chaque
        // recalcul : on garde ceux du dernier recalcul (les événements d'un même recalcul arrivent à moins de 100 ms les uns des autres).
        const blinkingMarkers: { marker: CesiumNS.Billboard; phase: number }[] = [];
        let lastClusterEventAt = 0;
        if (blinkOn) {
          viewer.scene.preRender.addEventListener(() => {
            const now = performance.now();
            for (const { marker, phase } of blinkingMarkers) marker.color = Cesium.Color.WHITE.withAlpha(blinkLevel(now, phase, 0.55));
          });
        }
        const clustering = eventSource.clustering;
        clustering.enabled = false;
        clustering.pixelRange = CLUSTER_PIXEL_RANGE;
        clustering.minimumClusterSize = CLUSTER_MIN_SIZE;
        clustering.clusterEvent.addEventListener((clustered, cluster) => {
          // Jamais de groupe invisible : un groupe de Cesium compte des marqueurs, pas des événements (doublons éventuels dans les
          // données) ; son point a au moins la taille du plus petit palier.
          const count = Math.max(distinctIds(clustered.map((e) => e.properties?.eventId?.getValue())).length, clustered.length, CLUSTER_MIN_SIZE);
          const diameter = ringStyle ? ringDiameter(count) : clusterDotDiameter(count);
          cluster.label.show = false;
          cluster.point.show = false;
          const marker = cluster.billboard;
          marker.show = true;
          marker.image = ringStyle ? clusterRingImage(count) : clusterDotImage(diameter);
          marker.width = ringStyle ? ringCanvasSize(diameter) : clusterDotCanvasSize(diameter);
          marker.height = ringStyle ? ringCanvasSize(diameter) : clusterDotCanvasSize(diameter);
          marker.verticalOrigin = Cesium.VerticalOrigin.CENTER;
          marker.eyeOffset = new Cesium.Cartesian3(0, 0, -50);
          marker.id = clustered;
          // Le point se pose sur un lieu réel du groupe, pas sur son centre de gravité.
          const anchor = clusterAnchor(Cesium, clustered);
          if (anchor) marker.position = cluster.label.position = cluster.point.position = anchor;
          if (blinkOn) {
            const at = performance.now();
            if (at - lastClusterEventAt > 100) blinkingMarkers.length = 0;
            lastClusterEventAt = at;
            const phase = (((anchor ? (anchor.x + anchor.y) * 1e-3 : count * 0.618034) % 1) + 1) % 1;
            blinkingMarkers.push({ marker, phase });
          }
          refreshSoon();
        });
        applyEventMode(eventSource, shared.eventMode);
        // Zoom proche : même au même lieu, les événements d'un groupe doivent pouvoir se séparer. Sous 500 km d'altitude les groupes
        // éclatent donc en points individuels, avec l'écart en couronne de main ; ils se reforment au-dessus de 700 km.
        const groupScene = viewer.scene;
        const groupCamera = viewer.camera;
        groupScene.postRender.addEventListener(() => {
          const exploded = explodedAtHeight(shared.exploded, groupCamera.positionCartographic.height);
          if (exploded === shared.exploded) return;
          shared.exploded = exploded;
          applyEventMode(eventSource, shared.eventMode);
          groupScene.requestRender();
        });
      }
      layerSources.events = eventSource;

      const earthquakeSource = new Cesium.CustomDataSource("earthquakes");
      for (const eq of earthquakes) {
        const popup: EntityPopupData = {
          layerKey: "earthquakes",
          badge: "SÉISME",
          title: `M${eq.magnitude.toFixed(1)} — ${eq.place ?? "Lieu inconnu"}`,
          fields: [
            { label: "Magnitude", value: `M${eq.magnitude.toFixed(1)}` },
            { label: "Profondeur", value: eq.depthKm != null ? `${eq.depthKm.toFixed(1)} km` : "Inconnue" },
            { label: "Heure", value: formatDateTime(eq.time) },
            ...(eq.alert ? [{ label: "Alerte PAGER", value: PAGER_LABELS[eq.alert] ?? eq.alert }] : []),
            ...(eq.tsunami ? [{ label: "Tsunami", value: "Alerte émise (voir la fiche)" }] : []),
            ...(eq.felt ? [{ label: "Ressenti", value: `${eq.felt} témoignage${eq.felt > 1 ? "s" : ""}` }] : []),
            { label: "Coordonnées", value: `${eq.lat.toFixed(2)}, ${eq.lon.toFixed(2)}` },
          ],
          href: eq.url ?? undefined,
          hrefLabel: "Fiche USGS →",
        };
        earthquakeSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(eq.lon, eq.lat, 0),
          point: {
            // Taille et couleur selon la magnitude : petit et jaune pour M4, gros et rouge à M7+.
            pixelSize: quakeSize(eq.magnitude),
            color: Cesium.Color.fromCssColorString(quakeColor(eq.magnitude)).withAlpha(0.8),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
          properties: { popup: JSON.stringify(popup), eventTime: eq.time },
        });
      }
      layerSources.earthquakes = earthquakeSource;

      const naturalEventSources: Record<LayerKey, CesiumNS.CustomDataSource> = {
        wildfires: new Cesium.CustomDataSource("wildfires"),
        storms: new Cesium.CustomDataSource("storms"),
        volcanoes: new Cesium.CustomDataSource("volcanoes"),
        floods: new Cesium.CustomDataSource("floods"),
        droughts: new Cesium.CustomDataSource("droughts"),
      } as Record<LayerKey, CesiumNS.CustomDataSource>;
      for (const evt of naturalEvents) {
        const layerKey = NATURAL_EVENT_LAYER[evt.category];
        const period =
          evt.date && evt.endDate && evt.endDate.slice(0, 10) !== evt.date.slice(0, 10)
            ? `du ${formatDay(evt.date)} au ${formatDay(evt.endDate)}`
            : evt.date
              ? formatDay(evt.date)
              : null;
        const popup: EntityPopupData = {
          layerKey,
          badge: NATURAL_EVENT_LABELS[evt.category],
          title: evt.title,
          fields: [
            ...(evt.severity ? [{ label: "Intensité", value: evt.severity }] : []),
            ...(evt.alert ? [{ label: "Alerte", value: ALERT_LABELS[evt.alert.toLowerCase()] ?? evt.alert }] : []),
            ...(evt.country ? [{ label: "Pays", value: evt.country }] : []),
            ...(period ? [{ label: "Période", value: period }] : []),
            { label: "Localisation", value: `${evt.lat.toFixed(2)}, ${evt.lon.toFixed(2)}` },
            { label: "Source", value: evt.source === "GDACS" ? "GDACS (ONU / Commission européenne)" : "EONET (NASA)" },
          ],
          links: evt.links,
          // Volcans : photo et description Wikipédia au clic (rien si l'article n'existe pas).
          wikiQuery: evt.category === "volcanoes" ? volcanoName(evt.title) : undefined,
          wikiPhotoOnly: evt.category === "volcanoes",
        };
        const alertScale = evt.alert?.toLowerCase() === "red" ? 1.6 : evt.alert?.toLowerCase() === "orange" ? 1.3 : 1;
        naturalEventSources[layerKey].entities.add({
          position: Cesium.Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
          // Épingle illustrée, plus grande si l'alerte est élevée ; les feux (très nombreux) en plus petit.
          billboard: pinBillboard(Cesium, PIN_OF_CATEGORY[evt.category], (evt.category === "wildfires" ? 24 : 32) * alertScale),
          properties: {
            popup: JSON.stringify(popup),
            eventTime: evt.date ? new Date(evt.date).getTime() : undefined,
            eventEnd: evt.endDate ? new Date(evt.endDate).getTime() : undefined,
          },
        });
      }
      layerSources.wildfires = naturalEventSources.wildfires;
      layerSources.storms = naturalEventSources.storms;
      layerSources.volcanoes = naturalEventSources.volcanoes;
      layerSources.floods = naturalEventSources.floods;
      layerSources.droughts = naturalEventSources.droughts;

      const launchSource = new Cesium.CustomDataSource("launches");
      for (const l of launches) {
        const pad = [l.padName, l.location].filter(Boolean).join(" — ");
        const popup: EntityPopupData = {
          layerKey: "launches",
          badge: l.past ? "LANCEMENT EFFECTUÉ" : "LANCEMENT PRÉVU",
          title: l.name,
          imageUrl: l.padImage ?? undefined,
          fields: [
            { label: l.past ? "Date" : "Date prévue", value: l.net ? formatDateTime(l.net) : "Inconnue" },
            { label: "Statut", value: l.statusName ?? "Inconnu" },
            { label: "Chargement", value: l.missionType ?? "Non précisé" },
            ...(l.missionName ? [{ label: "Mission", value: l.missionName }] : []),
            ...(l.orbit ? [{ label: "Orbite", value: l.orbit }] : []),
            ...(l.customers.length ? [{ label: "Client", value: l.customers.join(", ") }] : []),
            ...(l.rocket ? [{ label: "Lanceur", value: `${l.rocket}${l.provider ? ` (${l.provider})` : ""}` }] : []),
            { label: "Pas de tir", value: pad || "Inconnu" },
            ...(l.country ? [{ label: "Pays", value: l.country }] : []),
          ],
        };
        launchSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(l.lon, l.lat, 0),
          billboard: pinBillboard(Cesium, "launch", 34),
          properties: { popup: JSON.stringify(popup), eventTime: l.net ? Date.parse(l.net) : undefined },
        });
      }
      layerSources.launches = launchSource;

      // Satellites: positions are computed server-side (lib/layers/satellites.ts)
      // as a snapshot at page-render time, refreshed on the existing hourly
      // ISR revalidation — satellite.js is never bundled for the browser
      // (it broke the client build twice: v7's WASM hangs Turbopack, v6
      // gets corrupted by the client minifier into a runtime syntax error).
      const satelliteSource = new Cesium.CustomDataSource("satellites");
      for (const sat of satellites) {
        const popup: EntityPopupData = {
          layerKey: "satellites",
          badge: "SATELLITE",
          title: sat.name,
          flagIso2: sat.ownerIso2 ?? undefined,
          fields: [
            { label: "Fonction", value: sat.fn },
            ...(sat.owner ? [{ label: "Propriétaire", value: sat.owner }] : []),
            ...(sat.launchDate ? [{ label: "Lancé", value: sat.launchDate.length > 4 ? formatDay(sat.launchDate) : `en ${sat.launchDate}` }] : []),
            { label: "Altitude", value: `${Math.round(sat.altitudeMeters / 1000).toLocaleString("fr-FR")} km` },
            ...(sat.norad ? [{ label: "N° NORAD", value: String(sat.norad) }] : []),
            ...(sat.intlDesignator ? [{ label: "Désignation", value: sat.intlDesignator }] : []),
          ],
          links: sat.norad
            ? [
                { label: "Position en direct (N2YO) →", href: `https://www.n2yo.com/satellite/?s=${sat.norad}` },
                { label: "Fiche CelesTrak →", href: `https://celestrak.org/satcat/table-satcat.php?CATNR=${sat.norad}` },
              ]
            : [],
          // Photo et description cherchées dans Wikipédia au clic (nom sans précision entre parenthèses).
          wikiQuery: `${sat.name.replace(/\s*\(.*?\)\s*/g, " ").trim()} satellite`,
        };
        satelliteSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(sat.lon, sat.lat, sat.altitudeMeters),
          point: {
            pixelSize: 4,
            color: Cesium.Color.fromCssColorString(satelliteColor(sat.fn)),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
          properties: { popup: JSON.stringify(popup) },
        });
      }
      layerSources.satellites = satelliteSource;

      for (const key of Object.keys(layerSources) as LayerKey[]) {
        const source = layerSources[key];
        if (!source) continue;
        // Pendant l'introduction, aucune couche n'est visible : elles apparaissent à la fin.
        source.show = introMode ? false : enabledLayers[key];
        viewer.dataSources.add(source);
      }
      dataSourcesRef.current = layerSources;
      // Contrôles manuels hors production (nombre d'événements par mode, groupes) : le globe n'est exposé nulle part en production.
      if (GLOBE_TEST_TOOLS) (window as unknown as { __equinoxeGlobe?: unknown }).__equinoxeGlobe = { viewer, sources: layerSources };

      // --- Introduction : vol de la caméra, puis révélation de l'accueil -------------
      // Le composant HomeIntro orchestre (titre, bouton « Passer », apparition de
      // l'interface) ; il parle au globe par des évènements du navigateur.
      if (introMode) {
        let finished = false;
        const defaultDestination = zoneCameraDestination(Cesium, shared.focusZone);
        const defaultOrientation = { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 };

        const finish = () => {
          if (finished) return;
          finished = true;
          introPending = false;
          boundariesLayer.show = true;
          if (viewer) viewer.scene.globe.enableLighting = shared.dayNight;
          // La nuit s'adoucit en douceur jusqu'au réglage habituel de l'accueil (carte lisible).
          const from = performance.now();
          const soften = (now: number) => {
            if (disposed || !viewer) return;
            const t = Math.min(1, (now - from) / 1800);
            const globe = viewer.scene.globe;
            globe.lightingFadeOutDistance = LIGHTING_INTRO.out + (LIGHTING_HOME.out - LIGHTING_INTRO.out) * t;
            globe.lightingFadeInDistance = LIGHTING_INTRO.in + (LIGHTING_HOME.in - LIGHTING_INTRO.in) * t;
            viewer.scene.requestRender();
            if (t < 1) requestAnimationFrame(soften);
          };
          requestAnimationFrame(soften);
          for (const key of Object.keys(dataSourcesRef.current) as LayerKey[]) {
            const source = dataSourcesRef.current[key];
            if (source) source.show = (shared.enabledLayers ?? enabledLayers)[key];
          }
          viewer?.scene.requestRender();
          window.dispatchEvent(new Event(INTRO_EVENTS.flightDone));
        };
        const onFly = () => {
          viewer?.camera.flyTo({
            destination: defaultDestination,
            orientation: defaultOrientation,
            duration: INTRO_FLIGHT_SECONDS,
            easingFunction: Cesium.EasingFunction.QUARTIC_IN_OUT,
            complete: finish,
            cancel: finish,
          });
        };
        const onSkip = () => {
          if (finished) return;
          viewer?.camera.cancelFlight();
          viewer?.camera.setView({ destination: defaultDestination, orientation: defaultOrientation });
          finish();
        };
        window.addEventListener(INTRO_EVENTS.fly, onFly);
        window.addEventListener(INTRO_EVENTS.skip, onSkip);
        removeIntroListeners = () => {
          window.removeEventListener(INTRO_EVENTS.fly, onFly);
          window.removeEventListener(INTRO_EVENTS.skip, onSkip);
        };

        // Prêt : les tuiles visibles sont chargées (ou 6 s écoulées, pour ne jamais bloquer).
        let announced = false;
        const announceReady = () => {
          if (announced) return;
          announced = true;
          window.dispatchEvent(new Event(INTRO_EVENTS.ready));
        };
        const stopWatching = viewer.scene.globe.tileLoadProgressEvent.addEventListener((pending: number) => {
          if (pending === 0) announceReady();
        });
        const readyTimer = window.setTimeout(announceReady, 6000);
        const previousRemove = removeIntroListeners;
        removeIntroListeners = () => {
          previousRemove();
          stopWatching();
          window.clearTimeout(readyTimer);
        };
      }

      // Cesium's own resize handling reacts to window resize, but not to
      // a flex-layout container being resized without a window resize
      // event — the same class of bug already hit (and fixed) for every
      // Leaflet map in this project. A ResizeObserver keeps it honest here.
      watchSize(viewer);
      builtSources = layerSources;
      builtLowPower = lowPower;
      builtComplete = true;

      // Cesium sometimes needs an explicit nudge to paint its first
      // frame when the container wasn't at its final layout size at
      // construction time (observed here: canvas stays blank for many
      // seconds without this, even with continuous rendering). One
      // resize+render one frame later is enough to unstick it.
      requestAnimationFrame(() => {
        viewer?.resize();
        viewer?.scene.requestRender();
      });
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      removeIntroListeners();
      viewerRef.current = null;
      dataSourcesRef.current = {};
      // Globe entièrement construit (et introduction terminée) : on le garde pour le retour.
      if (viewer && host && builtComplete && !introPending && !viewer.isDestroyed()) {
        if (persistentGlobe && persistentGlobe.viewer !== viewer) destroyPersistentGlobe();
        const kept: PersistentGlobe = {
          viewer,
          host,
          sources: builtSources,
          clickHandler,
          createdAt: Date.now(),
          lowPower: builtLowPower,
        };
        persistentGlobe = kept;
        host.remove();
        keepAlive(kept);
        return;
      }
      clickHandler?.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      host?.remove();
    };
    // Layer datasets are fetched once server-side and don't change for
    // the lifetime of this page — only enabledLayers changes at runtime,
    // and that's handled by the effect below without rebuilding the globe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryRisk]);

  // Cheap toggle: just flip `.show` on the already-built data sources —
  // and, for whichever entities carry an `eventTime` (earthquakes,
  // wildfires/storms/volcanoes/floods, launches — see the layer-building
  // code above), hide the ones outside the selected date range. Layers
  // with no per-item date (risk/aircraft/vessels/satellites) are
  // unaffected by `dateRange`; their entities simply never got an
  // `eventTime` property, so `t` stays undefined below and nothing is
  // hidden on that basis.
  useEffect(() => {
    for (const key of Object.keys(dataSourcesRef.current) as LayerKey[]) {
      const source = dataSourcesRef.current[key];
      if (!source) continue;
      source.show = enabledLayers[key];
      if (dateRange) applyDateFilter(source, dateRange);
    }
    // Événements : la période vient d'être appliquée (anneaux compris) ; en mode « Groupes » les anneaux sont remasqués et les groupes recalculés.
    const eventsSource = dataSourcesRef.current.events;
    if (GLOBE_CLUSTERING_ENABLED && eventsSource) applyEventMode(eventsSource, shared.eventMode);
    // Le globe ne se redessine plus en continu : on le demande après un changement de couche,
    // puis encore quelques fois, le temps que les images des marqueurs (ronds illustrés,
    // points d'articles) soient chargées sur la carte graphique ; sinon elles n'apparaissent qu'au
    // prochain mouvement du globe.
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.scene.requestRender();
    const timers = [80, 250, 600, 1200, 2500].map((ms) =>
      window.setTimeout(() => {
        if (!viewer.isDestroyed()) viewer.scene.requestRender();
      }, ms),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [enabledLayers, dateRange]);

  // Bascule « Points / Groupes » : seul l'affichage change, sans relancer le filtre de dates ni toucher à la caméra.
  useEffect(() => {
    const source = dataSourcesRef.current.events;
    if (!GLOBE_CLUSTERING_ENABLED || !source) return;
    applyEventMode(source, eventMode);
    viewerRef.current?.scene.requestRender();
  }, [eventMode]);

  // Anneaux qui s'élargissent autour des points d'événements : le globe ne se redessine que sur
  // demande, on le demande donc une vingtaine de fois par seconde tant que la couche est affichée
  // (rien si l'utilisateur a réduit les animations, ni quand l'onglet est caché).
  useEffect(() => {
    // Mode « Groupes » : pas d'anneau d'onde ; seul le style « anneaux » redessine (clignotement lent, une dizaine de fois par seconde).
    const groupsMode = GLOBE_CLUSTERING_ENABLED && eventMode === "groups";
    const blinking = pointStyleFromSearch(window.location.search) === "anneaux" && !window.matchMedia("(pointer: coarse)").matches;
    if (!enabledLayers.events || (groupsMode && !blinking) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Téléphone : 9 redessins par seconde au lieu de 20 (le globe est maintenant net à l'arrêt, donc plus coûteux à redessiner).
    const everyMs = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900 ? 110 : groupsMode ? 100 : 50;
    const id = window.setInterval(() => {
      const viewer = viewerRef.current;
      if (viewer && !viewer.isDestroyed() && !document.hidden) viewer.scene.requestRender();
    }, everyMs);
    return () => window.clearInterval(id);
  }, [enabledLayers.events, eventMode]);

  // Survol d'un article du bandeau : redessin immédiat (sans attendre l'image suivante de l'anneau,
  // coupée si l'utilisateur a réduit les animations).
  useEffect(
    () =>
      onHoveredBrief(() => {
        const viewer = viewerRef.current;
        if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender();
      }),
    [],
  );

  // Mise au point sur une zone : la caméra vole vers elle. Quand la fiche de zone se ferme (« Retour au globe », Échap), la caméra ne
  // bouge pas : on reste là où l'on avait zoomé (la vue d'ensemble se retrouve avec le bouton de recentrage). Le premier rendu
  // (aucune zone) ne bouge pas non plus la caméra.
  const previousZoneRef = useRef<ZoneSlug | null>(null);
  useEffect(() => {
    if (previousZoneRef.current === focusZone) return;
    previousZoneRef.current = focusZone;
    if (focusZone === null) return;
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return;
    viewer.camera.flyTo({
      destination: zoneCameraDestination(Cesium, focusZone),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      // Mouvement réduit : la caméra se place directement, sans vol.
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1.8,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
    });
  }, [focusZone]);

  // Câbles sous-marins : fichier de 320 Ko, chargé à la première activation de la couche
  // (pas au démarrage de l'accueil), puis conservé avec le globe.
  useEffect(() => {
    if (!enabledLayers.cables) return;
    let cancelled = false;
    let timer: number | undefined;
    let tries = 0;
    const attempt = () => {
      if (cancelled) return;
      const viewer = viewerRef.current;
      const Cesium = window.Cesium;
      const sources = dataSourcesRef.current;
      // Le globe n'est pas encore construit (la couche « risk » en est le signe).
      if (!viewer || viewer.isDestroyed() || !Cesium || !sources.risk) {
        if (++tries < 40) timer = window.setTimeout(attempt, 500);
        return;
      }
      if (sources.cables) return;
      void loadCableSource(Cesium)
        .then((source) => {
          if (!source || cancelled || viewer.isDestroyed() || viewerRef.current !== viewer) return;
          source.show = shared.enabledLayers?.cables ?? true;
          viewer.dataSources.add(source);
          dataSourcesRef.current.cables = source;
          viewer.scene.requestRender();
        })
        .catch((err) => console.error("Câbles sous-marins : chargement impossible", err));
    };
    attempt();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [enabledLayers.cables]);

  function handleZoomIn() {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.4);
  }

  function handleZoomOut() {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.4);
  }

  function handleRecenter() {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(DEFAULT_LON, DEFAULT_LAT, DEFAULT_HEIGHT),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      duration: 1.2,
    });
  }

  function handleCompass() {
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;
    if (!viewer || !Cesium) return;
    // Re-levels to north-up/straight-down without changing position or
    // zoom — the camera's heading/roll can drift from mouse-drag rotation.
    viewer.camera.setView({ orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 } });
  }

  return (
    <>
      <div ref={containerRef} className={styles.globeContainer} />
      <div className={styles.controls} data-intro-hide>
        <button type="button" className={styles.controlBtn} aria-label="Nord" onClick={handleCompass}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 5v3M12 5l2.2 4.4L12 8l-2.2 1.4L12 5Z" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <div className={styles.zoomGroup}>
          <button type="button" className={styles.controlBtn} aria-label="Zoomer" onClick={handleZoomIn}>
            +
          </button>
          <button type="button" className={styles.controlBtn} aria-label="Dézoomer" onClick={handleZoomOut}>
            −
          </button>
        </div>
        <button type="button" className={styles.controlBtn} aria-label="Recentrer" onClick={handleRecenter}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          </svg>
        </button>
      </div>
    </>
  );
}
