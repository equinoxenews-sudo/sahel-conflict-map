import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import nextConfig from "../next.config";
import { ESPACE_NAV, ESPACE_ROOT, activeSection, dossierHref, parseDossierView } from "../lib/espace";

test("le menu a les sept entrées, dans l'ordre voulu, chacune avec sa page", () => {
  assert.deepEqual(
    ESPACE_NAV.map((item) => item.label),
    ["Menu", "Notes", "Graph", "Investigation", "Supervision", "Tracking", "Outils"],
  );
  assert.equal(new Set(ESPACE_NAV.map((item) => item.href)).size, ESPACE_NAV.length);
  for (const item of ESPACE_NAV) {
    assert.ok(item.href === ESPACE_ROOT || item.href.startsWith(`${ESPACE_ROOT}/`), item.href);
    const page = item.href === ESPACE_ROOT ? "app/mon-espace/page.tsx" : `app${item.href}/page.tsx`;
    assert.ok(existsSync(page), `page manquante : ${page}`);
  }
});

test("la vue d'un dossier : notes par défaut, valeurs inconnues ignorées", () => {
  assert.equal(parseDossierView(null), "notes");
  assert.equal(parseDossierView(undefined), "notes");
  assert.equal(parseDossierView("graphe"), "graphe");
  assert.equal(parseDossierView("sources"), "sources");
  assert.equal(parseDossierView("n'importe quoi"), "notes");
  assert.equal(dossierHref("abc", "graphe"), "/mon-espace/dossier/abc?vue=graphe");
  assert.equal(dossierHref("a b/c"), "/mon-espace/dossier/a%20b%2Fc?vue=notes");
});

test("le menu allume la bonne entrée, y compris pour un dossier ouvert sur le graphe ou sur les notes", () => {
  assert.equal(activeSection("/mon-espace", null), "menu");
  assert.equal(activeSection("/mon-espace/", null), "menu");
  assert.equal(activeSection("/mon-espace/notes", null), "notes");
  assert.equal(activeSection("/mon-espace/graph", null), "graph");
  assert.equal(activeSection("/mon-espace/investigation", null), "investigation");
  assert.equal(activeSection("/mon-espace/supervision", null), "supervision");
  assert.equal(activeSection("/mon-espace/tracking", null), "tracking");
  assert.equal(activeSection("/mon-espace/outils", null), "outils");
  assert.equal(activeSection("/mon-espace/dossier/xyz", "graphe"), "graph");
  assert.equal(activeSection("/mon-espace/dossier/xyz", "notes"), "notes");
  assert.equal(activeSection("/mon-espace/dossier/xyz", "sources"), "notes");
  assert.equal(activeSection("/mon-espace/dossier/xyz", null), "notes");
  assert.equal(activeSection("/mon-espace/inconnu", null), "menu");
  assert.equal(activeSection("/autre-page", null), "menu");
});

test("les anciennes adresses d'Investigation mènent toujours aux nouvelles pages", async () => {
  const rules = (await nextConfig.redirects?.()) ?? [];
  const to = (source: string) => rules.find((rule) => rule.source === source)?.destination;
  assert.equal(to("/investigation"), "/mon-espace");
  assert.equal(to("/investigation/dossiers"), "/mon-espace/notes");
  assert.equal(to("/investigation/dossiers/:id"), "/mon-espace/dossier/:id");
  assert.equal(to("/investigation/recherche"), "/mon-espace/investigation");
  assert.equal(to("/investigation/toolbox"), "/mon-espace/outils");
  // Aucune destination ne retombe sur l'ancien espace (boucle).
  for (const rule of rules) assert.ok(!rule.destination.startsWith("/investigation"), rule.source);
});

test("plus aucun lien du site ne pointe vers l'ancien espace, et le bandeau n'a plus d'« Investigation »", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(tsx?|css)$/.test(name)) files.push(full);
    }
  };
  for (const dir of ["app", "components"]) walk(dir);
  // Une adresse « /investigation » ou « /investigation/… » écrite en dur (hors imports de modules).
  const oldRoute = /["'`]\/investigation(\/|["'`?])/;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.ok(!oldRoute.test(source), `${file} contient encore un lien vers /investigation`);
  }
  const header = readFileSync("components/equinoxe/Header.tsx", "utf8");
  assert.ok(!/>\s*Investigation\s*</.test(header), "le bandeau affiche encore « Investigation »");
  assert.match(header, /href="\/mon-espace"/);
  assert.ok(!existsSync("app/investigation"), "l'ancien dossier app/investigation existe encore");
});
