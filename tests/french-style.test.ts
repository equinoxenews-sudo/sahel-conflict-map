import assert from "node:assert/strict";
import test from "node:test";
import { findFranglais, FRENCH_STYLE_RULES } from "../lib/frenchStyle";

test("repère les anglicismes voyants d'un titre", () => {
  assert.equal(findFranglais("Oleshky : cessez-le-feu humanitaire brokérisé par Mme Melania Trump"), "brokérisé");
  assert.equal(findFranglais("Un accord brokerisé par Doha"), "brokérisé");
  assert.equal(findFranglais("Washington a brokéré la trêve"), "broker");
  assert.equal(findFranglais("Russie : intensification des rafles forcées pour le recrutement de soldats contractuels"), "rafle pour un recrutement");
  assert.equal(findFranglais("Le recrutement par rafles se poursuit"), "rafle pour un recrutement");
  assert.equal(findFranglais("Cette décision impacte les exportations"), "impacter");
  assert.equal(findFranglais("Le pays doit adresser le problème de la dette"), "adresser un problème");
  assert.equal(findFranglais("Kiev va implémenter la réforme"), "implémenter");
});

test("laisse passer le français correct", () => {
  assert.equal(findFranglais("Russie : intensification de la conscription forcée de soldats contractuels"), null);
  assert.equal(findFranglais("La police mène une rafle dans le quartier"), null);
  assert.equal(findFranglais("Cessez-le-feu humanitaire obtenu sous la médiation de Mme Melania Trump"), null);
  assert.equal(findFranglais("Le choc des cultures a un impact sur le commerce"), null);
  assert.equal(findFranglais("Les prix augmentent"), null);
  assert.equal(findFranglais(""), null);
});

test("les consignes de langue nomment les exemples à proscrire et le bon équivalent", () => {
  for (const expected of ["brokérisé", "enrôlement forcé", "rafle", "cessez-le-feu", "faux amis"]) assert.ok(FRENCH_STYLE_RULES.includes(expected), expected);
});
