import assert from "node:assert/strict";
import test from "node:test";
import { gateDecision, gateEnabled, isMachinePath, isOpenPath, maintenanceOn, safeReturnPath } from "../lib/siteGate";

test("la maintenance s'active par SITE_MAINTENANCE et épargne seulement les routes des machines", () => {
  assert.equal(maintenanceOn({ SITE_MAINTENANCE: "on" }), true);
  assert.equal(maintenanceOn({ SITE_MAINTENANCE: " TRUE " }), true);
  assert.equal(maintenanceOn({ SITE_MAINTENANCE: "off" }), false);
  assert.equal(maintenanceOn({}), false);
  assert.equal(isMachinePath("/api/sync-briefs"), true);
  assert.equal(isMachinePath("/api/admin/login"), false);
  assert.equal(isMachinePath("/acces"), false);
});

test("sans connexion, les pages renvoient vers /acces et l'API est refusée", () => {
  assert.equal(gateDecision("/", false), "login");
  assert.equal(gateDecision("/mon-espace", false), "login");
  assert.equal(gateDecision("/data/world-countries.geo.json", false), "login");
  assert.equal(gateDecision("/api/search", false), "deny");
  assert.equal(gateDecision("/api/investigation/cloud", false), "deny");
});

test("connecté, tout passe", () => {
  assert.equal(gateDecision("/", true), "allow");
  assert.equal(gateDecision("/api/search", true), "allow");
});

test("la page de connexion et les routes des machines restent ouvertes", () => {
  for (const path of ["/acces", "/api/admin/login", "/api/sync-briefs", "/api/sync-gdelt", "/api/cron/dispatch/sync-briefs.yml", "/api/revalidate", "/api/telegram/webhook", "/robots.txt"]) {
    assert.equal(gateDecision(path, false), "allow", path);
  }
});

test("une adresse qui ressemble à une adresse ouverte ne l'est pas", () => {
  assert.equal(isOpenPath("/acces-prive"), false);
  assert.equal(isOpenPath("/api/session"), false);
  assert.equal(isOpenPath("/api/admin/situation/3"), false);
  assert.equal(isOpenPath("/equinoxe/hero-europe.webp"), false);
});

test("la porte est fermée en production même sans mot de passe, sauf interrupteur de secours", () => {
  assert.equal(gateEnabled({ NODE_ENV: "production" }, false), true);
  assert.equal(gateEnabled({ NODE_ENV: "production" }, true), true);
  assert.equal(gateEnabled({ NODE_ENV: "production", SITE_GATE: "off" }, true), false);
  assert.equal(gateEnabled({ NODE_ENV: "development" }, false), false);
  assert.equal(gateEnabled({ NODE_ENV: "development" }, true), true);
});

test("le retour après connexion ne sort jamais du site", () => {
  assert.equal(safeReturnPath("/mon-espace?onglet=graphe"), "/mon-espace?onglet=graphe");
  assert.equal(safeReturnPath("//evil.example"), "/");
  assert.equal(safeReturnPath("/\\evil.example"), "/");
  assert.equal(safeReturnPath("https://evil.example"), "/");
  assert.equal(safeReturnPath("/acces?retour=/"), "/");
  assert.equal(safeReturnPath(undefined), "/");
});
