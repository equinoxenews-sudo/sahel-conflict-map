import test from "node:test";
import assert from "node:assert/strict";
import { exportFrame, fitAspect, fitPixelRatio, frameOfRect, visibleRect } from "../lib/investigation/exportImage";

test("Cadre d'export : englobe toutes les fiches avec une marge", () => {
  const frame = exportFrame(
    [
      { x: 100, y: 50, width: 300, height: 100 },
      { x: 700, y: 400, width: 300, height: 200 },
    ],
    60,
    2
  );
  assert.ok(frame);
  assert.equal(frame.minX, 40);
  assert.equal(frame.minY, -10);
  assert.equal(frame.width, 1000 + 60 - 40);
  assert.equal(frame.height, 600 + 60 + 10);
  assert.equal(frame.pixelRatio, 2);
});

test("Un très grand graphe réduit la netteté pour tenir dans un canevas", () => {
  const frame = exportFrame([{ x: 0, y: 0, width: 20000, height: 400 }], 0, 2);
  assert.ok(frame);
  assert.ok(frame.pixelRatio < 1);
  assert.ok(frame.width * frame.pixelRatio <= 9000.5);
});

test("Rien à exporter si le graphe est vide", () => {
  assert.equal(exportFrame([]), null);
});

test("Format diapo : le cadre prend le rapport 16:9 sans rien couper", () => {
  const base = exportFrame([{ x: 0, y: 0, width: 1000, height: 1000 }], 0, 3);
  assert.ok(base);
  const slide = fitAspect(base, 16 / 9, 3);
  assert.ok(Math.abs(slide.width / slide.height - 16 / 9) < 0.01);
  assert.ok(slide.width >= base.width && slide.height >= base.height);
  // le graphe reste centré dans le cadre élargi
  assert.equal(slide.minX + slide.width / 2, base.minX + base.width / 2);
  const tall = fitAspect(exportFrame([{ x: 0, y: 0, width: 4000, height: 300 }], 0, 3)!, 16 / 9, 3);
  assert.ok(Math.abs(tall.width / tall.height - 16 / 9) < 0.01);
  assert.ok(tall.height >= 300);
});

test("La netteté demandée est respectée tant que l'image tient, réduite sinon", () => {
  assert.equal(fitPixelRatio(1920, 1080, 4), 4);
  const huge = fitPixelRatio(6000, 4000, 4);
  assert.ok(huge < 4);
  assert.ok(6000 * huge * 4000 * huge <= 50_000_001);
  assert.ok(6000 * huge <= 9000.5);
});

test("La partie affichée à l'écran devient le cadre d'export, sans marge", () => {
  const frame = frameOfRect({ x: 120, y: -40, width: 800.4, height: 450.2 }, 3);
  assert.equal(frame.minX, 120);
  assert.equal(frame.minY, -40);
  assert.equal(frame.width, 801);
  assert.equal(frame.height, 451);
  assert.equal(frame.pixelRatio, 3);
});

test("Format diapo avec bandeau : l'image finale (bandeau compris) est en 16:9", () => {
  const base = exportFrame([{ x: 0, y: 0, width: 1000, height: 1000 }], 0, 3)!;
  const slide = fitAspect(base, 16 / 9, 3, 86);
  assert.ok(Math.abs(slide.width / (slide.height + 86) - 16 / 9) < 0.01);
  const wide = fitAspect(exportFrame([{ x: 0, y: 0, width: 4000, height: 300 }], 0, 3)!, 16 / 9, 3, 86);
  assert.ok(Math.abs(wide.width / (wide.height + 86) - 16 / 9) < 0.01);
});

test("La partie visible se lit dans la transformation de la vue", () => {
  const container = { clientWidth: 800, clientHeight: 600 } as HTMLElement;
  const viewport = { style: { transform: "translate(-200px, 100px) scale(0.5)" } } as unknown as HTMLElement;
  assert.deepEqual(visibleRect(container, viewport), { x: 400, y: -200, width: 1600, height: 1200 });
  // graphe non affiché ou transformation illisible : pas de partie visible
  assert.equal(visibleRect({ clientWidth: 800, clientHeight: 0 } as HTMLElement, viewport), null);
  assert.equal(visibleRect(container, { style: { transform: "" } } as unknown as HTMLElement), null);
});
