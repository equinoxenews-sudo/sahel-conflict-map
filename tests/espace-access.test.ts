import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cloudOwnerOf, requestMatchesAccount, storageScopeOf } from "../lib/accountScope";
import type { Account } from "../lib/accounts";
import { ESPACE_NAV } from "../lib/espace";
import { canOpenSection, lockedSections, navForAccount, sectionView } from "../lib/espaceAccess";

const OWNER: Account = { id: "nicof", name: "Nicof", tier: "owner", timezone: "Europe/Paris" };
const MEMBER: Account = { id: "marc", name: "Marc", tier: "plus", timezone: "Europe/Paris" };
const RESTRICTED = ["investigation", "supervision", "tracking"] as const;
const OPEN = ["menu", "notes", "graph", "outils"] as const;

test("le fondateur ouvre toutes les rubriques", () => {
  for (const item of ESPACE_NAV) assert.equal(canOpenSection(OWNER, item.key), true, item.key);
});

test("un compte individuel ouvre Menu, Notes, Graph et Outils, et seulement ceux-là", () => {
  for (const key of OPEN) assert.equal(canOpenSection(MEMBER, key), true, key);
  for (const key of RESTRICTED) assert.equal(canOpenSection(MEMBER, key), false, key);
});

test("personne n'ouvre rien sans compte, quelle que soit la rubrique", () => {
  for (const item of ESPACE_NAV) assert.equal(canOpenSection(null, item.key), false, item.key);
});

test("toutes les offres autres que « owner » sont refusées sur les trois rubriques réservées", () => {
  for (const tier of ["plus", "intelligence", "pro", "enterprise"] as const) {
    for (const key of RESTRICTED) assert.equal(canOpenSection({ tier }, key), false, `${tier}/${key}`);
  }
});

test("la page d'une rubrique réservée affiche « Bientôt » à un compte sans droit, son contenu au fondateur", () => {
  for (const key of RESTRICTED) {
    assert.equal(sectionView(MEMBER, key), "soon", key);
    assert.equal(sectionView(null, key), "soon", key);
    assert.equal(sectionView(OWNER, key), "content", key);
  }
  for (const key of OPEN) assert.equal(sectionView(MEMBER, key), "content", key);
});

test("le menu d'un compte individuel garde les sept entrées mais verrouille Investigation, Supervision et Tracking", () => {
  const nav = navForAccount(MEMBER, ESPACE_NAV);
  assert.deepEqual(nav.map((item) => item.label), ESPACE_NAV.map((item) => item.label));
  assert.deepEqual(nav.filter((item) => item.locked).map((item) => item.key), ["investigation", "supervision", "tracking"]);
  assert.deepEqual(lockedSections(MEMBER, ESPACE_NAV.map((item) => item.key)), ["investigation", "supervision", "tracking"]);
});

test("le menu du fondateur n'a aucune entrée verrouillée", () => {
  assert.equal(navForAccount(OWNER, ESPACE_NAV).some((item) => item.locked), false);
});

test("chaque page de rubrique réservée passe par la porte serveur, ou n'est que la page « Bientôt »", () => {
  for (const key of RESTRICTED) {
    const source = readFileSync(`app/mon-espace/${key}/page.tsx`, "utf8");
    const usesGate = source.includes("SectionGate");
    const imports = [...source.matchAll(/^import .* from "(.+)";$/gm)].map((match) => match[1]);
    const onlyComingSoon = imports.length === 1 && imports[0] === "@/components/espace/ComingSoon";
    assert.ok(usesGate || onlyComingSoon, `app/mon-espace/${key}/page.tsx affiche autre chose que « Bientôt » sans passer par SectionGate`);
  }
});

test("la porte serveur lit le compte sur le serveur, jamais sur un état du navigateur", () => {
  const source = readFileSync("components/espace/SectionGate.tsx", "utf8");
  assert.ok(!source.includes('"use client"'));
  assert.ok(source.includes("spaceAccount()"));
  assert.ok(source.includes("sectionView("));
});

test("où vivent les données : le fondateur garde les emplacements d'origine, chaque compte a les siens", () => {
  assert.equal(cloudOwnerOf(OWNER), null);
  assert.equal(storageScopeOf(OWNER), "");
  assert.equal(cloudOwnerOf(MEMBER), "marc");
  assert.equal(storageScopeOf(MEMBER), "marc");
  // Même avec un identifiant « nicof », seule l'offre « owner » donne les emplacements du fondateur.
  assert.equal(cloudOwnerOf({ id: "nicof", tier: "plus" }), "nicof");
  assert.equal(storageScopeOf({ id: "nicof", tier: "plus" }), "nicof");
});

test("une page ouverte pour un compte ne parle pas à l'espace en ligne d'un autre", () => {
  assert.equal(requestMatchesAccount("marc", MEMBER), true);
  assert.equal(requestMatchesAccount("nicof", MEMBER), false);
  assert.equal(requestMatchesAccount("", MEMBER), false);
  assert.equal(requestMatchesAccount(null, MEMBER), false);
  assert.equal(requestMatchesAccount("MARC", MEMBER), false);
});

test("les routes de la copie en ligne exigent l'en-tête du compte, et le client l'envoie", () => {
  for (const route of ["app/api/investigation/cloud/route.ts", "app/api/investigation/cloud/[id]/route.ts"]) {
    assert.ok(readFileSync(route, "utf8").includes("requestMatchesAccount("), route);
  }
  assert.ok(readFileSync("lib/investigation/cloudSync.ts", "utf8").includes("[ACCOUNT_HEADER]"));
});
