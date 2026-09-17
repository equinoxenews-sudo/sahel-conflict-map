"use client";

import "cesium/Build/Cesium/Widgets/widgets.css";
import { useEffect, useRef } from "react";
import { RISK_COLORS, type CountryRisk } from "@/lib/countryRisk";
import styles from "./Globe3D.module.css";

// Esri's free World Imagery tile service — no API key, no Cesium ion
// account. This is what gives the globe real tiled detail that sharpens
// as you zoom in, unlike a single static texture.
const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const IMAGERY_CREDIT = "Esri, Maxar, Earthstar Geographics";

// Cesium needs to find its Workers/Assets/Widgets/ThirdParty static assets
// at runtime. Pointing CESIUM_BASE_URL at a CDN build of the exact
// installed version avoids a webpack/Turbopack asset-copy step entirely.
const CESIUM_VERSION = "1.145.0";
const CESIUM_BASE_URL = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/`;

const INITIAL_VIEW = { lon: 15, lat: 15, heightMeters: 14_000_000 };

interface Globe3DProps {
  countryRisk: Record<string, CountryRisk>;
}

export default function Globe3D({ countryRisk }: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let viewer: import("cesium").Viewer | null = null;
    let resizeObserver: ResizeObserver | null = null;

    (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = CESIUM_BASE_URL;

    import("cesium").then(async (Cesium) => {
      if (disposed) return;

      viewer = new Cesium.Viewer(container, {
        baseLayer: new Cesium.ImageryLayer(
          new Cesium.UrlTemplateImageryProvider({ url: IMAGERY_URL, credit: IMAGERY_CREDIT })
        ),
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
      });

      viewer.scene.globe.enableLighting = false;
      viewer.scene.backgroundColor = Cesium.Color.BLACK;

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          INITIAL_VIEW.lon,
          INITIAL_VIEW.lat,
          INITIAL_VIEW.heightMeters
        ),
      });

      // Country risk overlay — same GeoJSON + ISO3 lookup as before, ported
      // from three-globe's polygonsData to Cesium's GeoJsonDataSource.
      // GeoJsonDataSource sets each Entity's id from the feature's
      // top-level `id` when present, which is exactly the ISO3 code here
      // (see public/data/world-countries.geo.json), so no extra mapping
      // is needed to look up countryRisk[entity.id].
      // Fill only, no stroke/outline: Cesium's outline geometry runs
      // rhumb-line subdivision on each polygon's boundary, which throws
      // "Too many properties to enumerate" on some of these country
      // shapes (large vertex counts / antimeridian-spanning rings,
      // e.g. Russia, Antarctica). Filled polygons alone don't hit that
      // code path at all.
      const dataSource = await Cesium.GeoJsonDataSource.load("/data/world-countries.geo.json", {
        fill: Cesium.Color.WHITE.withAlpha(0.05),
      });
      if (disposed) return;

      for (const entity of dataSource.entities.values) {
        if (!entity.polygon) continue;
        const iso3 = String(entity.id);
        const risk = countryRisk[iso3];
        const color = risk
          ? Cesium.Color.fromCssColorString(RISK_COLORS[risk.tier]).withAlpha(0.45)
          : Cesium.Color.WHITE.withAlpha(0.05);

        entity.polygon.material = new Cesium.ColorMaterialProperty(color);
        entity.polygon.outline = new Cesium.ConstantProperty(false);

        // Cesium's InfoBox renders `description` inside a sandboxed
        // iframe — CSS module classes never reach it, so this needs
        // inline styles rather than styles.tooltip.
        const name = entity.properties?.name?.getValue() ?? iso3;
        entity.description = new Cesium.ConstantProperty(
          `<div style="font-family:inherit;"><strong>${name}</strong>${
            risk ? `<br/>${risk.label}` : ""
          }</div>`
        );
      }

      viewer.dataSources.add(dataSource);

      // Cesium's own resize handling reacts to window resize, but not to a
      // flex-layout container being resized without a window resize event
      // — the same class of bug already hit (and fixed) for every Leaflet
      // map in this project. A ResizeObserver keeps it honest here too.
      resizeObserver = new ResizeObserver(() => {
        viewer?.resize();
      });
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      viewer?.destroy();
    };
  }, [countryRisk]);

  return <div ref={containerRef} className={styles.globeContainer} />;
}
