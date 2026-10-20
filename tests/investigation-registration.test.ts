import assert from "node:assert/strict";
import test from "node:test";
import { findRegistration, IDENTIFIER_PRESETS, REGISTRATION_LABEL, withRegistration } from "../lib/investigation/attributes";
import { FLAG_COUNTRIES } from "../lib/countryFlagIndex";
import type { EntityAttribute } from "../lib/investigation/types";

const phone: EntityAttribute = { id: "p", kind: "phone", value: "+229 94 50 78 90", status: "documented" };
const plate: EntityAttribute = { id: "r", kind: "identifier", label: "Immatriculation", value: "BJ-1234-RB", status: "hypothesis", sourceId: "s1" };
const serial: EntityAttribute = { id: "n", kind: "identifier", label: "N° de série", value: "SN-1", status: "documented" };

test("une immatriculation est un identifiant nommé « Immatriculation »", () => {
  assert.equal(findRegistration([phone, serial]), undefined);
  assert.equal(findRegistration([phone, plate, serial]), plate);
  assert.equal(findRegistration([{ ...plate, label: "immatriculation (plaque)" }])?.id, "r");
  assert.equal(findRegistration([{ ...plate, kind: "phone" }]), undefined);
});

test("saisir une immatriculation crée un identifiant, sans toucher aux autres coordonnées", () => {
  const next = withRegistration([phone], "5N-ABC", () => "new");
  assert.equal(next.length, 2);
  assert.equal(next[0], phone);
  assert.deepEqual(next[1], { id: "new", kind: "identifier", label: REGISTRATION_LABEL, value: "5N-ABC", status: "documented" });
});

test("modifier l'immatriculation garde son statut et sa source", () => {
  const next = withRegistration([phone, plate], "BJ-9999-RB");
  assert.equal(next.length, 2);
  assert.deepEqual(next[1], { ...plate, value: "BJ-9999-RB" });
});

test("vider l'immatriculation retire la ligne, et rien ne se crée pour une saisie vide", () => {
  assert.deepEqual(withRegistration([phone, plate], "  "), [phone]);
  const untouched = [phone];
  assert.equal(withRegistration(untouched, ""), untouched);
});

test("les noms d'identifiants proposés commencent par l'immatriculation", () => {
  assert.equal(IDENTIFIER_PRESETS[0], REGISTRATION_LABEL);
  assert.equal(new Set(IDENTIFIER_PRESETS).size, IDENTIFIER_PRESETS.length);
});

test("la liste des pays à drapeau propose les États-Unis, l'Inde, la Chine et le Canada", () => {
  const byIso = new Map(FLAG_COUNTRIES.map((country) => [country.iso2, country.name]));
  assert.equal(byIso.get("US"), "États-Unis");
  assert.equal(byIso.get("IN"), "Inde");
  assert.equal(byIso.get("CN"), "Chine");
  assert.equal(byIso.get("CA"), "Canada");
  assert.equal(new Set(FLAG_COUNTRIES.map((country) => country.iso2)).size, FLAG_COUNTRIES.length);
});
