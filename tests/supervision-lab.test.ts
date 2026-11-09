import assert from "node:assert/strict";
import test from "node:test";
import { applyFilters, fakeEvents } from "../lib/supervision/lab/fixtures";
import { COLUMNS, bandFor, breakpointForWidth, clampPlacements, compact, deriveLayout, findFreeSpot, hasOverlap, minSizeFor, nudge, samePlacements } from "../lib/supervision/lab/layout";
import {
  DEFAULT_FILTERS,
  addWidget,
  duplicateWidget,
  effectiveFilters,
  emptyState,
  exampleState,
  kindsOf,
  layoutFor,
  parseState,
  removeWidget,
  resetWidget,
  serializeState,
  setLayout,
  updateWidget,
} from "../lib/supervision/lab/state";

test("largeurs : 12 colonnes en bureau, 6 en tablette, 1 sur téléphone", () => {
  assert.equal(COLUMNS.desktop, 12);
  assert.equal(breakpointForWidth(1200), "desktop");
  assert.equal(breakpointForWidth(899), "tablet");
  assert.equal(breakpointForWidth(600), "tablet");
  assert.equal(breakpointForWidth(559), "mobile");
  assert.equal(COLUMNS.mobile, 1);
});

test("première place libre : jamais de chevauchement, jamais hors grille", () => {
  const placed = [{ id: "a", x: 0, y: 0, w: 6, h: 4 }];
  assert.deepEqual(findFreeSpot(placed, 6, 4, 12), { x: 6, y: 0 });
  assert.deepEqual(findFreeSpot(placed, 8, 3, 12), { x: 0, y: 4 });
  assert.deepEqual(findFreeSpot([], 20, 2, 12), { x: 0, y: 0 }, "un module trop large est ramené à la grille");
});

test("compactage : remonte sans chevaucher et garde l'ordre des modules", () => {
  const list = [
    { id: "a", x: 0, y: 0, w: 4, h: 3 },
    { id: "b", x: 0, y: 8, w: 4, h: 3 },
    { id: "c", x: 6, y: 5, w: 3, h: 2 },
  ];
  const out = compact(list);
  assert.deepEqual(out.map((p) => p.id), ["a", "b", "c"]);
  assert.deepEqual(out.map((p) => p.y), [0, 3, 0]);
  assert.equal(hasOverlap(out), false);
});

test("disposition déduite : mêmes modules, largeurs ramenées, aucun chevauchement, un seul module par ligne sur téléphone", () => {
  const state = exampleState();
  const desktop = state.layouts.desktop;
  assert.equal(desktop.length, 6);
  assert.equal(hasOverlap(desktop), false);
  for (const cols of [6, 1]) {
    const derived = deriveLayout(desktop, kindsOf(state), cols);
    assert.equal(derived.length, 6);
    assert.equal(hasOverlap(derived), false);
    assert.ok(derived.every((p) => p.x >= 0 && p.x + p.w <= cols), `dans les ${cols} colonnes`);
    assert.ok(derived.every((p) => p.w >= minSizeFor(kindsOf(state)[p.id], cols).w));
  }
  const mobile = deriveLayout(desktop, kindsOf(state), 1);
  assert.ok(mobile.every((p) => p.x === 0 && p.w === 1));
  assert.deepEqual(new Set(mobile.map((p) => p.y)).size, 6, "six lignes distinctes");
});

test("tableau vierge : ajouter, dupliquer et supprimer s'appliquent aux trois largeurs", () => {
  let state = emptyState();
  assert.equal(Object.keys(state.widgets).length, 0);
  const a = addWidget(state, "summary");
  state = a.state;
  const b = addWidget(state, "map");
  state = b.state;
  assert.equal(Object.keys(state.widgets).length, 2);
  for (const bp of ["desktop", "tablet", "mobile"] as const) {
    const layout = layoutFor(state, bp);
    assert.equal(layout.length, 2, bp);
    assert.equal(hasOverlap(layout), false, bp);
  }
  const copy = duplicateWidget(state, a.id);
  assert.ok(copy);
  state = copy.state;
  assert.equal(state.widgets[copy.id].kind, "summary");
  assert.match(state.widgets[copy.id].title, /\(copie\)/);
  assert.equal(layoutFor(state, "mobile").length, 3);
  state = removeWidget(state, a.id);
  assert.equal(Object.keys(state.widgets).length, 2);
  assert.ok(!layoutFor(state, "desktop").some((p) => p.id === a.id));
  assert.ok(!layoutFor(state, "mobile").some((p) => p.id === a.id));
});

test("deux modules du même type peuvent avoir des filtres différents", () => {
  let state = emptyState();
  const first = addWidget(state, "feed");
  state = first.state;
  const second = addWidget(state, "feed");
  state = second.state;
  state = updateWidget(state, first.id, { follow: true });
  state = updateWidget(state, second.id, { follow: false, local: { periodDays: 7, theme: "conflits" } });
  state = { ...state, globals: { periodDays: 90, theme: "politique" } };
  assert.deepEqual(effectiveFilters(state.widgets[first.id], state.globals).filters, { periodDays: 90, theme: "politique" }, "suit le filtre global");
  assert.deepEqual(effectiveFilters(state.widgets[second.id], state.globals).filters, { periodDays: 7, theme: "conflits" }, "garde les siens");
});

test("un filtre local explicite prévaut sur le global, et le signale", () => {
  let state = emptyState();
  const a = addWidget(state, "stats");
  state = updateWidget(a.state, a.id, { follow: true, local: { theme: "securite" } });
  const result = effectiveFilters(state.widgets[a.id], { periodDays: 90, theme: "politique" });
  assert.equal(result.filters.theme, "securite");
  assert.equal(result.filters.periodDays, 90);
  assert.equal(result.overridesGlobal, true);
  assert.equal(effectiveFilters(state.widgets[a.id], { periodDays: 90, theme: "securite" }).overridesGlobal, false);
  assert.equal(effectiveFilters(updateWidget(state, a.id, { follow: false }).widgets[a.id], DEFAULT_FILTERS).overridesGlobal, false, "ne suit pas : rien à signaler");
});

test("réinitialiser un module remet titre, filtres et état par défaut", () => {
  let state = emptyState();
  const a = addWidget(state, "alerts");
  state = updateWidget(a.state, a.id, { title: "Mon titre", follow: true, local: { periodDays: 7 }, demoState: "error" });
  state = resetWidget(state, a.id);
  assert.deepEqual({ ...state.widgets[a.id] }, { id: a.id, kind: "alerts", title: "Alertes", follow: false, local: {}, demoState: "normal" });
});

test("sauvegarde puis restauration : exactement la même disposition, sur les trois largeurs", () => {
  let state = exampleState();
  state = setLayout(state, "mobile", layoutFor(state, "mobile"));
  state = setLayout(state, "tablet", layoutFor(state, "tablet"));
  const again = parseState(serializeState(state));
  assert.ok(again);
  assert.deepEqual(again, state);
  for (const bp of ["desktop", "tablet", "mobile"] as const) assert.ok(samePlacements(layoutFor(again, bp), layoutFor(state, bp)), bp);
});

test("modifier la disposition du téléphone ne déplace pas celle du bureau", () => {
  let state = exampleState();
  const before = state.layouts.desktop;
  const mobile = layoutFor(state, "mobile").map((p, index, all) => ({ ...p, y: all.length - 1 - index }));
  state = setLayout(state, "mobile", compact(mobile));
  assert.deepEqual(state.layouts.desktop, before);
});

test("texte enregistré invalide ou incohérent : refusé, on repart du tableau vierge", () => {
  const good = exampleState();
  assert.equal(parseState(null), null);
  assert.equal(parseState("pas du json"), null);
  assert.equal(parseState("{}"), null);
  const overlapping = { ...good, layouts: { ...good.layouts, desktop: good.layouts.desktop.map((p) => ({ ...p, x: 0, y: 0 })) } };
  assert.equal(parseState(JSON.stringify(overlapping)), null, "chevauchement");
  const outside = { ...good, layouts: { ...good.layouts, desktop: good.layouts.desktop.map((p) => ({ ...p, x: 11 })) } };
  assert.equal(parseState(JSON.stringify(outside)), null, "hors de la grille");
  const unknown = { ...good, widgets: { ...good.widgets, m1: { ...good.widgets.m1, kind: "inconnu" } } };
  assert.equal(parseState(JSON.stringify(unknown)), null, "module inconnu");
  const orphan = { ...good, layouts: { ...good.layouts, desktop: good.layouts.desktop.slice(1) } };
  assert.equal(parseState(JSON.stringify(orphan)), null, "module sans place");
});

test("un moteur qui renvoie des tailles trop petites ou hors grille est ramené dans les limites", () => {
  const state = exampleState();
  const bad = [{ id: "m1", x: 10, y: -2, w: 1, h: 1 }];
  const [fixed] = clampPlacements(bad, kindsOf(state), 12);
  assert.ok(fixed.w >= 3 && fixed.h >= 3, "minimum du module");
  assert.ok(fixed.x + fixed.w <= 12 && fixed.y >= 0);
});

test("rendu adaptatif : compact, standard ou développé d'après les dimensions du module, jamais d'après l'écran", () => {
  assert.equal(bandFor(299, 400), "compact");
  assert.equal(bandFor(320, 400), "standard", "un module pleine largeur de téléphone est standard");
  assert.equal(bandFor(500, 200), "compact");
  assert.equal(bandFor(450, 320), "standard");
  assert.equal(bandFor(700, 420), "expanded");
  assert.equal(bandFor(700, 300), "standard");
  assert.equal(bandFor(299, 600), "compact");
});

test("données fictives : toutes marquées [DÉMO], stables pour une date donnée, filtrables", () => {
  const now = Date.parse("2026-11-09T09:00:00Z");
  const events = fakeEvents(now);
  assert.equal(events.length, 48);
  assert.ok(events.every((e) => e.title.startsWith("[DÉMO]")));
  assert.deepEqual(fakeEvents(now), events);
  const week = applyFilters(events, { periodDays: 7, theme: "all" }, now);
  const quarter = applyFilters(events, { periodDays: 90, theme: "all" }, now);
  assert.ok(week.length < quarter.length);
  assert.ok(applyFilters(events, { periodDays: 90, theme: "conflits" }, now).every((e) => e.theme === "conflits"));
  assert.ok(events.every((e) => e.x >= 0 && e.x <= 100 && e.y >= 0 && e.y <= 100), "positions abstraites, pas de coordonnées réelles");
});

test("décalage au clavier : une cellule à la fois, jamais hors grille, sous le minimum ni sur un autre module", () => {
  const placed = [
    { id: "a", x: 0, y: 0, w: 4, h: 3 },
    { id: "b", x: 4, y: 0, w: 4, h: 3 },
  ];
  const min = { w: 3, h: 3 };
  assert.equal(nudge(placed, "a", { dx: 1 }, 12, min), null, "b est sur le chemin");
  assert.equal(nudge(placed, "a", { dx: -1 }, 12, min), null, "hors de la grille");
  assert.equal(nudge(placed, "a", { dw: -2 }, 12, min), null, "sous le minimum");
  assert.deepEqual(nudge(placed, "b", { dx: 1 }, 12, min)?.find((p) => p.id === "b"), { id: "b", x: 5, y: 0, w: 4, h: 3 });
  assert.deepEqual(nudge(placed, "b", { dw: 4 }, 12, min)?.find((p) => p.id === "b")?.w, 8);
  assert.equal(nudge(placed, "b", { dw: 5 }, 12, min), null, "dépasse la grille");
  const moved = nudge(placed, "b", { dy: 3 }, 12, min);
  assert.ok(moved && !hasOverlap(moved));
  assert.equal(moved.find((p) => p.id === "b")?.y, 0, "la gravité le remonte tant que la place est libre");
  assert.equal(nudge(placed, "zzz", { dx: 1 }, 12, min), null);
});

test("une disposition avec des trous est remontée (jamais renvoyée telle quelle au moteur) : sinon la grille boucle", () => {
  let state = exampleState();
  const holey = layoutFor(state, "desktop").map((p) => ({ ...p, y: p.y + 4 }));
  state = setLayout(state, "desktop", holey);
  assert.deepEqual(state.layouts.desktop, compact(state.layouts.desktop), "déjà compacte");
  assert.ok(state.layouts.desktop.some((p) => p.y === 0));
  const saved = JSON.parse(serializeState(exampleState()));
  saved.layouts.desktop = saved.layouts.desktop.map((p: { y: number }) => ({ ...p, y: p.y + 7 }));
  const reread = parseState(JSON.stringify(saved));
  assert.ok(reread);
  assert.deepEqual(reread.layouts.desktop, compact(reread.layouts.desktop));
  assert.ok(reread.layouts.desktop.some((p) => p.y === 0), "enregistrement ancien remonté au lieu d'être refusé");
});

test("dépose sur un module existant : le nouveau prend la case visée et pousse les voisins vers le bas, sans chevauchement", () => {
  let state = exampleState();
  const target = layoutFor(state, "desktop").find((p) => p.id === "m1");
  assert.ok(target);
  const added = addWidget(state, "notes", { at: { breakpoint: "desktop", x: target.x, y: target.y } });
  state = added.state;
  const layout = layoutFor(state, "desktop");
  assert.equal(layout.length, 7);
  assert.equal(hasOverlap(layout), false);
  const dropped = layout.find((p) => p.id === added.id);
  assert.deepEqual({ x: dropped?.x, y: dropped?.y }, { x: target.x, y: target.y }, "à la case visée");
  assert.ok((layout.find((p) => p.id === "m1")?.y ?? 0) >= (dropped?.y ?? 0) + (dropped?.h ?? 0), "l'ancien occupant est poussé sous le nouveau");
  assert.equal(hasOverlap(layoutFor(state, "tablet")), false);
  assert.equal(hasOverlap(layoutFor(state, "mobile")), false);
});
