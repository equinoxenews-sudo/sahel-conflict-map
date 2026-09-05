"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { COUNTRY_RISK, RISK_COLORS } from "@/lib/countryRisk";
import styles from "./Globe3D.module.css";

interface GeoFeature {
  type: "Feature";
  id: string;
  properties: { name: string };
  geometry: unknown;
}

// Some country polygons in the source GeoJSON have complex/concave shapes
// that three-globe's cap triangulation can mis-wind, which shows up as
// black flickering patches (unlit backfaces). MeshBasicMaterial (unlit) +
// DoubleSide avoids that regardless of winding order.
const materialCache = new Map<string, THREE.Material>();

function materialForFeature(feature: GeoFeature): THREE.Material {
  const risk = COUNTRY_RISK[feature.id];
  const color = risk ? RISK_COLORS[risk.tier] : "#ffffff";
  const opacity = risk ? 0.45 : 0.05;
  const key = `${color}-${opacity}`;

  let material = materialCache.get(key);
  if (!material) {
    material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    materialCache.set(key, material);
  }
  return material;
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
          .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-dark.jpg")
          .backgroundImageUrl("https://unpkg.com/three-globe/example/img/night-sky.png")
          .backgroundColor("rgba(0,0,0,0)")
          .showAtmosphere(true)
          .atmosphereColor("#2a4a75")
          .atmosphereAltitude(0.15)
          .polygonsData(geoData.features)
          .polygonCapMaterial((f: unknown) => materialForFeature(f as GeoFeature))
          .polygonSideColor(() => "rgba(0, 0, 0, 0)")
          .polygonStrokeColor(() => "rgba(255,255,255,0.3)")
          .polygonAltitude(0.008)
          .polygonsTransitionDuration(0)
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
        controls.autoRotate = false;

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
