import assert from "node:assert/strict";
import test from "node:test";
import { MAX_DASHBOARD_BYTES, validateDashboardState } from "../lib/supervision/core/dashboards";
import { emptyState, exampleState } from "../lib/supervision/dashboard/state";

test("tableau de bord reçu du navigateur : un état valide passe, tel quel", () => {
  const state = exampleState();
  const result = validateDashboardState(JSON.parse(JSON.stringify(state)));
  assert.ok(result.ok);
  if (result.ok) assert.deepEqual(result.state, state);
  assert.ok(validateDashboardState(emptyState()).ok, "un tableau vierge est valide");
});

test("tableau de bord reçu : documents incohérents, mal formés ou démesurés refusés", () => {
  for (const bad of [null, undefined, 42, "texte", [], {}, { version: 2 }, { ...exampleState(), widgets: "x" }]) {
    const r = validateDashboardState(bad);
    assert.equal(r.ok, false, JSON.stringify(bad)?.slice(0, 40));
  }
  const overlapping = exampleState();
  overlapping.layouts.desktop = overlapping.layouts.desktop.map((p) => ({ ...p, x: 0, y: 0 }));
  assert.equal(validateDashboardState(overlapping).ok, false, "modules qui se chevauchent");
  const orphan = exampleState();
  orphan.layouts.desktop = orphan.layouts.desktop.slice(1);
  assert.equal(validateDashboardState(orphan).ok, false, "module sans place");
  const huge = validateDashboardState({ ...exampleState(), padding: "x".repeat(MAX_DASHBOARD_BYTES) });
  assert.ok(!huge.ok && huge.code === "too_large");
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.equal(validateDashboardState(cyclic).ok, false, "référence circulaire");
});
