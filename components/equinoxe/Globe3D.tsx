"use client";

import { useEffect, useRef } from "react";
import type * as CesiumNS from "cesium";
import { RISK_COLORS, type CountryRisk } from "@/lib/countryRisk";
import type { MilitaryAircraft } from "@/lib/layers/aircraft";
import type { Earthquake } from "@/lib/layers/earthquakes";
import type { Launch } from "@/lib/layers/launches";
import type { NaturalEvent, NaturalEventCategory } from "@/lib/layers/naturalEvents";
import type { SatellitePosition } from "@/lib/layers/satellites";
import type { LayerKey } from "@/lib/layers/types";
import type { VesselPosition } from "@/types/vessel";
import styles from "./Globe3D.module.css";

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
const CESIUM_VERSION = "1.145.0";
const CESIUM_BASE_URL = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/`;

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

const NATURAL_EVENT_COLORS: Record<NaturalEventCategory, string> = {
  wildfires: "#ff6d00",
  severeStorms: "#29b6f6",
  volcanoes: "#e53935",
  floods: "#8d6e63",
};

const NATURAL_EVENT_LAYER: Record<NaturalEventCategory, LayerKey> = {
  wildfires: "wildfires",
  severeStorms: "storms",
  volcanoes: "volcanoes",
  floods: "floods",
};

interface Globe3DProps {
  countryRisk: Record<string, CountryRisk>;
  enabledLayers: Record<LayerKey, boolean>;
  aircraft: MilitaryAircraft[];
  satellites: SatellitePosition[];
  vessels: VesselPosition[];
  earthquakes: Earthquake[];
  naturalEvents: NaturalEvent[];
  launches: Launch[];
}

export default function Globe3D({
  countryRisk,
  enabledLayers,
  aircraft,
  satellites,
  vessels,
  earthquakes,
  naturalEvents,
  launches,
}: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataSourcesRef = useRef<Partial<Record<LayerKey, CesiumNS.DataSource>>>({});
  const viewerRef = useRef<CesiumNS.Viewer | null>(null);

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
    let resizeObserver: ResizeObserver | null = null;

    loadCesium().then(async (Cesium) => {
      if (disposed) return;

      viewer = new Cesium.Viewer(container, {
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
        // A single bad geometry (see the renderError handler below) must
        // not show Cesium's big built-in error panel over the whole globe.
        showRenderLoopErrors: false,
      });
      viewerRef.current = viewer;

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

      viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({ url: IMAGERY_URL, credit: IMAGERY_CREDIT })
      );
      // Added second (on top): transparent borders + place/capital labels.
      viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({ url: BOUNDARIES_URL, credit: IMAGERY_CREDIT })
      );

      // Day/night shading — the sun-relative lighting that gives the
      // globe a more dramatic, "real satellite" look (matches paraxis.app).
      viewer.scene.globe.enableLighting = true;
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
      viewer.scene.globe.maximumScreenSpaceError = 1;

      // Centered on the Sahel/Africa — the site's editorial focus —
      // rather than Cesium's generic flyHome() default view (which
      // opens over the Americas/Atlantic, unrelated to this site).
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(DEFAULT_LON, DEFAULT_LAT, DEFAULT_HEIGHT),
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

        const iso3 = String(entity.id);
        const risk = countryRisk[iso3];
        const color = risk
          ? Cesium.Color.fromCssColorString(RISK_COLORS[risk.tier]).withAlpha(0.28)
          : Cesium.Color.WHITE.withAlpha(0.05);

        entity.polygon.material = new Cesium.ColorMaterialProperty(color);
        entity.polygon.outline = new Cesium.ConstantProperty(false);

        // Cesium's InfoBox renders `description` inside a sandboxed
        // iframe — CSS module classes never reach it, so this needs
        // inline styles rather than a styles.* class.
        const name = entity.properties?.name?.getValue() ?? iso3;
        entity.description = new Cesium.ConstantProperty(
          `<div style="font-family:inherit;"><strong>${name}</strong>${
            risk ? `<br/>${risk.label}` : ""
          }</div>`
        );
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
        aircraftSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(a.lon, a.lat, a.altitude ?? 0),
          point: { pixelSize: 6, color: Cesium.Color.LIME, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 },
          description: `<div><strong>${a.callsign ?? a.hex}</strong><br/>${a.type ?? "Type inconnu"}${
            a.registration ? ` · ${a.registration}` : ""
          }${a.altitude != null ? `<br/>Altitude : ${Math.round(a.altitude)} m` : ""}</div>`,
        });
      }
      layerSources.aircraft = aircraftSource;

      const vesselSource = new Cesium.CustomDataSource("vessels");
      for (const v of vessels) {
        const vesselName = v.ship_name ?? `MMSI ${v.mmsi}`;
        const speedLine = v.speed != null ? `<br/>Vitesse : ${v.speed.toFixed(1)} nds` : "";
        vesselSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(v.longitude, v.latitude, 0),
          point: {
            pixelSize: 5,
            color: Cesium.Color.fromCssColorString("#42a5f5"),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
          description: `<div><strong>${vesselName}</strong>${speedLine}</div>`,
        });
      }
      layerSources.vessels = vesselSource;

      const earthquakeSource = new Cesium.CustomDataSource("earthquakes");
      for (const eq of earthquakes) {
        earthquakeSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(eq.lon, eq.lat, 0),
          point: {
            pixelSize: 6 + Math.max(eq.magnitude, 0) * 2,
            color: Cesium.Color.YELLOW.withAlpha(0.7),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
          description: `<div><strong>M${eq.magnitude.toFixed(1)}</strong> — ${eq.place ?? "Lieu inconnu"}</div>`,
        });
      }
      layerSources.earthquakes = earthquakeSource;

      const naturalEventSources: Record<LayerKey, CesiumNS.CustomDataSource> = {
        wildfires: new Cesium.CustomDataSource("wildfires"),
        storms: new Cesium.CustomDataSource("storms"),
        volcanoes: new Cesium.CustomDataSource("volcanoes"),
        floods: new Cesium.CustomDataSource("floods"),
      } as Record<LayerKey, CesiumNS.CustomDataSource>;
      for (const evt of naturalEvents) {
        const layerKey = NATURAL_EVENT_LAYER[evt.category];
        naturalEventSources[layerKey].entities.add({
          position: Cesium.Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
          point: {
            pixelSize: 7,
            color: Cesium.Color.fromCssColorString(NATURAL_EVENT_COLORS[evt.category]),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
          description: `<div><strong>${evt.title}</strong></div>`,
        });
      }
      layerSources.wildfires = naturalEventSources.wildfires;
      layerSources.storms = naturalEventSources.storms;
      layerSources.volcanoes = naturalEventSources.volcanoes;
      layerSources.floods = naturalEventSources.floods;

      const launchSource = new Cesium.CustomDataSource("launches");
      for (const l of launches) {
        const padLine = l.padName ? `<br/>${l.padName}` : "";
        const dateLine = l.net ? `<br/>${new Date(l.net).toLocaleString("fr-FR")}` : "";
        launchSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(l.lon, l.lat, 0),
          point: {
            pixelSize: 7,
            color: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString("#ff6d00"),
            outlineWidth: 2,
          },
          description: `<div><strong>${l.name}</strong>${padLine}${dateLine}</div>`,
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
        satelliteSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(sat.lon, sat.lat, sat.altitudeMeters),
          point: {
            pixelSize: 4,
            color: Cesium.Color.CYAN,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
          description: `<div><strong>${sat.name}</strong></div>`,
        });
      }
      layerSources.satellites = satelliteSource;

      for (const key of Object.keys(layerSources) as LayerKey[]) {
        const source = layerSources[key];
        if (!source) continue;
        source.show = enabledLayers[key];
        viewer.dataSources.add(source);
      }
      dataSourcesRef.current = layerSources;

      // Cesium's own resize handling reacts to window resize, but not to
      // a flex-layout container being resized without a window resize
      // event — the same class of bug already hit (and fixed) for every
      // Leaflet map in this project. A ResizeObserver keeps it honest here.
      resizeObserver = new ResizeObserver(() => {
        viewer?.resize();
      });
      resizeObserver.observe(container);

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
      viewer?.destroy();
      viewerRef.current = null;
      dataSourcesRef.current = {};
    };
    // Layer datasets are fetched once server-side and don't change for
    // the lifetime of this page — only enabledLayers changes at runtime,
    // and that's handled by the effect below without rebuilding the globe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryRisk]);

  // Cheap toggle: just flip `.show` on the already-built data sources.
  useEffect(() => {
    for (const key of Object.keys(dataSourcesRef.current) as LayerKey[]) {
      const source = dataSourcesRef.current[key];
      if (source) source.show = enabledLayers[key];
    }
  }, [enabledLayers]);

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
      <div className={styles.controls}>
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
