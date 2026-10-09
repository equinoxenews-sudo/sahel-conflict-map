import assert from "node:assert/strict";
import test from "node:test";
import { subsolarPoint, sunDirectionLocal } from "../lib/cinematic/sun";

test("Équinoxe de mars à midi UTC : Soleil près de l'équateur et du méridien de Greenwich", () => {
  const { lat, lon } = subsolarPoint(new Date("2026-03-20T12:00:00Z"));
  assert.ok(Math.abs(lat) < 1.5, `latitude ${lat}`);
  assert.ok(Math.abs(lon) < 5, `longitude ${lon}`);
});

test("Solstice de juin : le Soleil est au-dessus du tropique du Cancer", () => {
  const { lat } = subsolarPoint(new Date("2026-06-21T12:00:00Z"));
  assert.ok(Math.abs(lat - 23.4) < 0.5, `latitude ${lat}`);
});

test("Solstice de décembre : tropique du Capricorne", () => {
  const { lat } = subsolarPoint(new Date("2026-12-21T12:00:00Z"));
  assert.ok(Math.abs(lat + 23.4) < 0.5, `latitude ${lat}`);
});

test("Le point subsolaire avance de 15° vers l'ouest chaque heure", () => {
  const at = (hour: number) => subsolarPoint(new Date(Date.UTC(2026, 9, 9, hour))).lon;
  const step = (((at(13) - at(12)) % 360) + 360) % 360;
  assert.ok(Math.abs(step - 345) < 0.5, `pas de ${step}°`);
});

test("La direction du Soleil est un vecteur unitaire, sur +x quand il est à (0°, 0°)", () => {
  const [x, y, z] = sunDirectionLocal({ lat: 0, lon: 0 });
  assert.ok(Math.abs(x - 1) < 1e-9 && Math.abs(y) < 1e-9 && Math.abs(z) < 1e-9);
  const v = sunDirectionLocal({ lat: 40, lon: 70 });
  assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
});
