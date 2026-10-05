import test from "node:test";
import assert from "node:assert/strict";
import { attributeLink, findSharedValues, groupAttributes, pivotKey, safeHttpUrl } from "../lib/investigation/attributes";
import type { EntityAttribute } from "../lib/investigation/types";

const attr = (partial: Partial<EntityAttribute> & Pick<EntityAttribute, "kind" | "value">): EntityAttribute => ({
  id: crypto.randomUUID(),
  status: "documented",
  ...partial,
});

test("Les adresses non http(s) ne deviennent jamais des liens", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,x"), null);
  assert.equal(safeHttpUrl("https://exemple.org/a"), "https://exemple.org/a");
  assert.equal(attributeLink(attr({ kind: "website", value: "javascript:alert(1)" })), null);
  assert.equal(attributeLink(attr({ kind: "social", platform: "facebook", value: "x", url: "javascript:evil" })), "https://www.facebook.com/x");
});

test("Lien d'une coordonnée : e-mail, téléphone, pseudo de réseau", () => {
  assert.equal(attributeLink(attr({ kind: "email", value: "a@b.org" })), "mailto:a@b.org");
  assert.equal(attributeLink(attr({ kind: "phone", value: "+33 6 50 49 71 60" })), "tel:+33650497160");
  assert.equal(attributeLink(attr({ kind: "social", platform: "telegram", value: "@juliendijon" })), "https://t.me/juliendijon");
  assert.equal(attributeLink(attr({ kind: "social", platform: "whatsapp", value: "x" })), null);
  assert.equal(attributeLink(attr({ kind: "location", value: "Dijon" })), null);
});

test("Une valeur identique donne la même clé de comparaison, quelle que soit la forme", () => {
  assert.equal(pivotKey(attr({ kind: "email", value: " Julien@AfricanParks.org " })), pivotKey(attr({ kind: "email", value: "julien@africanparks.org" })));
  assert.equal(pivotKey(attr({ kind: "phone", value: "+33 6 50 49 71 60" })), pivotKey(attr({ kind: "phone", value: "0033650497160".replace(/^00/, "") })));
  assert.equal(
    pivotKey(attr({ kind: "social", platform: "facebook", value: "@julienc" })),
    pivotKey(attr({ kind: "social", platform: "facebook", value: "JulienC" }))
  );
  assert.notEqual(
    pivotKey(attr({ kind: "social", platform: "facebook", value: "julienc" })),
    pivotKey(attr({ kind: "social", platform: "instagram", value: "julienc" }))
  );
  assert.equal(pivotKey(attr({ kind: "location", value: "Dijon" })), null);
  assert.equal(pivotKey(attr({ kind: "phone", value: "123" })), null);
});

test("Les valeurs communes à deux fiches ressortent, pas celles d'une seule", () => {
  const shared = findSharedValues([
    { id: "a", attributes: [attr({ kind: "email", value: "x@y.org" }), attr({ kind: "phone", value: "+33 6 11 22 33 44" })] },
    { id: "b", attributes: [attr({ kind: "email", value: "X@Y.org" })] },
    { id: "c", attributes: [attr({ kind: "email", value: "autre@y.org" })] },
  ]);
  assert.equal(shared.length, 1);
  assert.deepEqual(shared[0].entityIds, ["a", "b"]);
  assert.equal(shared[0].kind, "email");
});

test("Un même compte sur deux fiches est un pivot, y compris par identifiant numérique", () => {
  const shared = findSharedValues([
    { id: "a", attributes: [attr({ kind: "social", platform: "facebook", value: "julienc", secondary: "100123" })] },
    { id: "b", attributes: [attr({ kind: "social", platform: "facebook", value: "autre-pseudo", secondary: "100123" })] },
  ]);
  assert.equal(shared.length, 1);
});

test("Regroupement pour la fiche : un bloc par type, un bloc par réseau, valeurs vides ignorées", () => {
  const groups = groupAttributes([
    attr({ kind: "location", value: "Dijon" }),
    attr({ kind: "email", value: "a@b.org" }),
    attr({ kind: "social", platform: "facebook", value: "julienc" }),
    attr({ kind: "social", platform: "instagram", value: "jc" }),
    attr({ kind: "location", value: "Tanguieta" }),
    attr({ kind: "phone", value: "   " }),
  ]);
  assert.deepEqual(groups.map((g) => g.title), ["E-mail", "Facebook", "Instagram", "Localisation"]);
  assert.equal(groups.find((g) => g.kind === "location")?.items.length, 2);
});
