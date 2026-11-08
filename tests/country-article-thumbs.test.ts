import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { ZONE_HERO_IMAGES } from "../lib/zoneHeroImages";

// Miniatures d'articles du panneau pays : l'image de l'article, sinon celle de sa zone, jamais d'icône cassée.

test("la liste des articles d'un pays transmet la zone de chaque article", () => {
  const source = fs.readFileSync("lib/countryArticles.ts", "utf8");
  assert.ok(/COLUMNS = "[^"]*zone_slug/.test(source), "la zone est lue en base");
  assert.ok(/zone: row\.zone_slug/.test(source), "la zone est renvoyée au panneau");
});

test("le panneau retombe sur l'image de la zone, puis sur un fond neutre, quand l'image de l'article manque ou ne se charge pas", () => {
  const panel = fs.readFileSync("components/equinoxe/GlobeCountryPanel.tsx", "utf8");
  assert.ok(panel.includes("getZoneHeroImage(article.zone)"), "image par défaut de la zone");
  assert.ok(/onError=\{\(\) => setStage\(/.test(panel), "bascule quand l'image ne se charge pas");
  assert.ok(/<span className=\{styles\.thumb\} aria-hidden="true" \/>/.test(panel), "fond neutre en dernier recours");
});

test("chaque zone du globe a son image par défaut, et le fichier existe", () => {
  for (const zone of ["afrique", "europe", "moyen-orient", "indopacifique", "amerique-du-sud"]) {
    const path = ZONE_HERO_IMAGES[zone];
    assert.ok(path, `${zone} a une image par défaut`);
    assert.ok(fs.existsSync(`public${path}`), `${path} existe`);
  }
});
