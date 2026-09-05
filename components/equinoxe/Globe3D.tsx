"use client";

import { useEffect, useRef } from "react";
import { COUNTRY_RISK, RISK_COLORS } from "@/lib/countryRisk";
import styles from "./Globe3D.module.css";

interface GeoFeature {
  type: "Feature";
  id: string;
  properties: { name: string };
  geometry: unknown;
}

function colorForFeature(feature: GeoFeature): string {
  const risk = COUNTRY_RISK[feature.id];
  return risk ? RISK_COLORS[risk.tier] : "rgba(255,255,255,0.06)";
}

export default function Globe3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let cleanupResize: (() => void) | null = null;

    Promise.all([import("globe.gl"), fetch("/data/world-countries.geo.json").then((r) => r.json())]).then(
      ([{ default: Globe }, geoData]) => {
        if (disposed) return;

        const el = container;
        const globe = new Globe(el)
          .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
          .backgroundImageUrl("https://unpkg.com/three-globe/example/img/night-sky.png")
          .backgroundColor("rgba(0,0,0,0)")
          .showAtmosphere(true)
          .atmosphereColor("#3a6fb5")
          .atmosphereAltitude(0.18)
          .polygonsData(geoData.features)
          .polygonCapColor((f: unknown) => colorForFeature(f as GeoFeature))
          .polygonSideColor(() => "rgba(0, 0, 0, 0)")
          .polygonStrokeColor(() => "rgba(255,255,255,0.25)")
          .polygonAltitude(0.006)
          .polygonLabel((f: unknown) => {
            const feat = f as GeoFeature;
            const risk = COUNTRY_RISK[feat.id];
            const name = feat.properties?.name ?? feat.id;
            return `<div class="${styles.tooltip}"><strong>${name}</strong>${
              risk ? `<br/>${risk.label}` : ""
            }</div>`;
          })
          .width(el.clientWidth)
          .height(el.clientHeight);

        globe.pointOfView({ lat: 15, lng: 15, altitude: 2.2 });

        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;

        const resize = () => {
          globe.width(el.clientWidth);
          globe.height(el.clientHeight);
        };
        window.addEventListener("resize", resize);
        cleanupResize = () => window.removeEventListener("resize", resize);
      }
    );

    return () => {
      disposed = true;
      cleanupResize?.();
      container.innerHTML = "";
    };
  }, []);

  return <div ref={containerRef} className={styles.globeContainer} />;
}
