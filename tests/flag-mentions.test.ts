import assert from "node:assert/strict";
import test from "node:test";
import { flagsInText, foldForMatch } from "../lib/flagMentions";

const codes = (text: string, limit?: number) => flagsInText(text, limit).map((flag) => flag.iso2);

test("un pays cité en tête de titre donne son drapeau, y compris ceux sans fiche pays (Afghanistan)", () => {
  assert.deepEqual(codes("Afghanistan — nouvelle offensive à Kandahar"), ["AF"]);
  assert.deepEqual(codes("Soudan : poursuite des combats"), ["SD"]);
});

test("plusieurs pays cités : tous leurs drapeaux, dans l'ordre du titre", () => {
  assert.deepEqual(codes("Qatar–France : accord sur la médiation"), ["QA", "FR"]);
  assert.deepEqual(codes("Qatar-France : accord"), ["QA", "FR"]);
  assert.deepEqual(codes("Iran–ONU : inspections relancées"), ["IR", "UN"]);
  assert.deepEqual(codes("Italie–Europe : sommet sur les migrations"), ["IT", "EU"]);
  assert.deepEqual(codes("Mali — la France suspend sa coopération"), ["ML", "FR"]);
});

test("les noms composés ne sont pas coupés : Royaume-Uni, Soudan du Sud, Guinée-Bissau", () => {
  assert.deepEqual(codes("Royaume-Uni et Iran : sanctions"), ["GB", "IR"]);
  assert.deepEqual(codes("Soudan du Sud — tensions à Juba"), ["SS"]);
  assert.deepEqual(codes("Guinée-Bissau : coup d'État déjoué"), ["GW"]);
  assert.deepEqual(codes("Guinée : élections"), ["GN"]);
  assert.deepEqual(codes("Corée du Nord et Corée du Sud : tirs"), ["KP", "KR"]);
});

test("alias courants : RDC, États-Unis, ONU, Union européenne, Birmanie", () => {
  assert.deepEqual(codes("RDC : le M23 avance"), ["CD"]);
  assert.deepEqual(codes("Washington et les Etats-Unis"), ["US"]);
  assert.deepEqual(codes("Le Conseil de sécurité de l'ONU se réunit"), ["UN"]);
  assert.deepEqual(codes("Union européenne : nouvelles sanctions"), ["EU"]);
  assert.deepEqual(codes("Birmanie : la junte frappe"), ["MM"]);
});

test("pas de faux positifs : un mot qui en contient un autre n'est pas un pays", () => {
  assert.deepEqual(codes("Nigeria : grève générale"), ["NG"]);
  assert.deepEqual(codes("Roman noir et Somalie"), ["SO"]);
  assert.deepEqual(codes("Aucun pays dans ce titre"), []);
});

test("sans doublon, et borné par la limite demandée", () => {
  assert.deepEqual(codes("France, France et encore la France"), ["FR"]);
  assert.deepEqual(codes("France, Italie, Espagne, Allemagne, Pologne", 3), ["FR", "IT", "ES"]);
  assert.equal(flagsInText("France, Italie, Espagne, Allemagne").length, 3);
});

test("accents et ponctuation ne comptent pas", () => {
  assert.equal(foldForMatch("Côte d'Ivoire — Émirats"), "cote d ivoire emirats");
  assert.deepEqual(codes("COTE D'IVOIRE : tension"), ["CI"]);
  assert.deepEqual(codes("Émirats arabes unis et Qatar"), ["AE", "QA"]);
});
