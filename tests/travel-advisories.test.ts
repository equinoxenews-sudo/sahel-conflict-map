import assert from "node:assert/strict";
import test from "node:test";
import {
  countMapPixels,
  countryNameOf,
  flagIso2,
  foldName,
  levelFromText,
  LEVEL_PALETTE,
  mapDateOf,
  mapImagePath,
  readLevels,
  resolveIso3,
  summaryOf,
  thinRing,
  zonesSection,
  type AdvisoryLevel,
} from "../lib/travelAdvisories";

/** Image RVB de test : des bandes de couleur, un bandeau de légende en bas (qui doit être ignoré). */
function image(width: number, height: number, stripes: [AdvisoryLevel | "grey", number][], legend: AdvisoryLevel[] = []): Uint8Array {
  const rgb = new Uint8Array(width * height * 3);
  const bodyHeight = Math.floor(height * 0.88);
  let y = 0;
  for (const [color, rows] of stripes) {
    for (let r = 0; r < rows && y < bodyHeight; r++, y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 3;
        const rgbColor = color === "grey" ? [200, 200, 200] : LEVEL_PALETTE[color];
        rgb.set(rgbColor, i);
      }
    }
  }
  // Légende : une pastille par niveau dans le bandeau du bas.
  legend.forEach((level, k) => {
    for (let ly = bodyHeight + 2; ly < bodyHeight + 8; ly++) for (let lx = 5 + k * 12; lx < 15 + k * 12; lx++) rgb.set(LEVEL_PALETTE[level], (ly * width + lx) * 3);
  });
  return rgb;
}

test("la surface de chaque couleur de la carte est comptée, le bandeau de légende ignoré", () => {
  const counts = countMapPixels(image(100, 100, [["yellow", 60], ["red", 20], ["grey", 8]], ["red", "orange", "yellow", "green"]), 100, 100);
  assert.equal(counts.yellow, 6000);
  assert.equal(counts.red, 2000);
  assert.equal(counts.orange, 0);
  assert.equal(counts.green, 0);
});

test("un pays jaune avec un peu de rouge : niveau jaune, signalé comme partiel", () => {
  const reading = readLevels(countMapPixels(image(100, 100, [["yellow", 60], ["orange", 10], ["red", 18]]), 100, 100));
  assert.ok(reading);
  assert.equal(reading.level, "yellow");
  assert.equal(reading.worst, "red");
  assert.equal(reading.partial, true);
  assert.deepEqual(reading.shares, { green: 0, yellow: 68, orange: 11, red: 20 });
});

test("un pays tout rouge n'est pas partiel, un pays tout vert reste vert", () => {
  const red = readLevels(countMapPixels(image(100, 100, [["red", 88]]), 100, 100));
  assert.deepEqual([red?.level, red?.worst, red?.partial], ["red", "red", false]);
  const green = readLevels(countMapPixels(image(100, 100, [["green", 88]]), 100, 100));
  assert.deepEqual([green?.level, green?.partial], ["green", false]);
});

test("une petite trace d'un niveau plus grave (moins de 3 %) est du bruit, pas une zone", () => {
  const reading = readLevels(countMapPixels(image(100, 100, [["green", 80], ["yellow", 2]]), 100, 100));
  assert.equal(reading?.level, "green");
  assert.equal(reading?.partial, false);
});

test("une carte sans couleur de la légende est inexploitable", () => {
  assert.equal(readLevels(countMapPixels(image(100, 100, [["grey", 88]]), 100, 100)), null);
});

test("sans carte, seul un « formellement déconseillé » sans autre niveau vaut pour tout le pays", () => {
  assert.equal(levelFromText("Zones formellement déconseillées. Il est formellement déconseillé de se rendre en Ukraine.")?.level, "red");
  assert.equal(levelFromText("Formellement déconseillé dans l'est ; vigilance renforcée ailleurs."), null);
  assert.equal(levelFromText("Aucune précision."), null);
  assert.equal(levelFromText(""), null);
});

test("le code ISO 3 du fond de carte se retrouve par exception ou par le nom anglais", () => {
  const geo = new Map([[foldName("Benin"), "BEN"], [foldName("Ivory Coast"), "CIV"]]);
  assert.equal(resolveIso3("BJ", "Benin", geo), "BEN");
  assert.equal(resolveIso3("US", "United States", geo), "USA");
  assert.equal(resolveIso3("CI", "Côte d’Ivoire", geo), "CIV");
  assert.equal(resolveIso3("MC", "Monaco", geo), null);
});

test("lecture d'une page du ministère : nom, drapeau, carte, date et section des zones", () => {
  const html = `<html><main><h1> Bénin </h1><img src="/files/files/drapeaux/bj.svg" />
    <h3>Zones de vigilance</h3><img loading="lazy" src="/files/files/cav/benin/20251112_benin-fcv.jpg" width="680" />
    <h3>Zones formellement déconseillées</h3><p>Il est formellement d&eacute;conseill&eacute; de se rendre dans les zones&nbsp;frontali&egrave;res.</p>
    <h2>Risques encourus et recommandations associées</h2><p>Autre chose.</p></main></html>`;
  assert.equal(countryNameOf(html), "Bénin");
  assert.equal(flagIso2(html), "BJ");
  assert.equal(mapImagePath(html), "/files/files/cav/benin/20251112_benin-fcv.jpg");
  assert.equal(mapDateOf("/files/files/cav/benin/20251112_benin-fcv.jpg"), "2025-11-12");
  assert.equal(mapDateOf("/files/files/cav/japon/27-05-2013-japon-fcv.jpg"), null);
  const section = zonesSection(html);
  assert.ok(section.includes("Zones formellement déconseillées"));
  assert.ok(!section.includes("Autre chose"));
});

test("le résumé est borné et coupé à un mot", () => {
  const long = `Zones de vigilance ${"mot ".repeat(300)}`;
  const summary = summaryOf(long, 100);
  assert.ok(summary.length <= 101 && summary.endsWith("…"));
  assert.equal(summaryOf("Court.", 100), "Court.");
});

test("un gros contour est allégé et refermé, un petit contour reste tel quel", () => {
  const big: number[][] = Array.from({ length: 1001 }, (_, i) => [i % 360, (i % 100) - 50]);
  big[1000] = big[0];
  const thin = thinRing(big, 300);
  assert.ok(thin.length <= 300 && thin.length > 50);
  assert.deepEqual(thin[thin.length - 1], thin[0]);
  const small = [[0, 0], [1, 0], [1, 1], [0, 0]];
  assert.deepEqual(thinRing(small, 300), small);
});
