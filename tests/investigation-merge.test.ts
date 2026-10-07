import test from "node:test";
import assert from "node:assert/strict";
import { findDuplicateCandidates, pairKey } from "../lib/investigation/duplicates";
import { planEntityMerge, type MergeChoices } from "../lib/investigation/merge";
import { applyEntityMerge } from "../lib/investigation/mergeData";
import {
  emptyInvestigationData,
  type EntityAttribute,
  type InvestigationData,
  type InvestigationEntity,
  type Note,
  type Relation,
} from "../lib/investigation/types";

const entity = (id: string, name: string, extra: Partial<InvestigationEntity> = {}): InvestigationEntity => ({
  id, dossierId: "d", type: "person", name, aliases: [], notes: "", position: { x: 0, y: 0 }, createdAt: "2026-10-07", ...extra,
});
const attr = (id: string, kind: EntityAttribute["kind"], value: string, extra: Partial<EntityAttribute> = {}): EntityAttribute => ({
  id, kind, value, status: "hypothesis", ...extra,
});
const note = (id: string, title: string, body: string, extra: Partial<Note> = {}): Note => ({
  id, dossierId: "d", title, body, claimType: "observed", linkedSourceIds: [], linkedEntityIds: [], createdAt: "2026-10-07", updatedAt: "2026-10-07", ...extra,
});
const relation = (id: string, source: string, target: string, extra: Partial<Relation> = {}): Relation => ({
  id, dossierId: "d", sourceEntityId: source, targetEntityId: target, label: "x", status: "hypothesis", justifyingSourceId: null, confidence: 50, createdAt: "2026-10-07", ...extra,
});

const KEEP_PRIMARY: MergeChoices = { name: "primary", role: "primary", country: "primary", image: "none" };

test("Doublons possibles : même nom, alias commun, même coordonnée ; jamais d'un autre type", () => {
  const entities = [
    entity("a", "Isidore Ogoudie"),
    entity("b", "isidore ogoudie"),
    entity("c", "Julien", { aliases: ["JC"], attributes: [attr("x1", "email", "jc@x.org")] }),
    entity("d", "J. Chevillot", { aliases: ["jc"], attributes: [attr("x2", "email", "JC@x.org")] }),
    entity("e", "Isidore Ogoudie", { type: "organization" }),
  ];
  const found = findDuplicateCandidates(entities, []);
  const byKey = new Map(found.map((c) => [c.key, c.reasons]));
  assert.deepEqual(byKey.get(pairKey("a", "b")), ["même nom"]);
  assert.deepEqual(byKey.get(pairKey("c", "d")), ["alias commun", "même e-mail"]);
  assert.equal(byKey.has(pairKey("a", "e")), false);
});

test("Une paire déjà liée comme doublon, ou ignorée, n'est plus proposée", () => {
  const entities = [entity("a", "Isidore"), entity("b", "Isidore"), entity("c", "Marc"), entity("d", "Marc")];
  const linked = relation("r", "a", "b", { typeKey: "possible_duplicate" });
  assert.equal(findDuplicateCandidates(entities, [linked], [pairKey("c", "d")]).length, 0);
});

test("Plan de fusion : alias réunis, coordonnées sans doublon, la mieux établie conservée", () => {
  const primary = entity("p", "Julien Chevillot", {
    role: "Manager",
    aliases: ["JC"],
    attributes: [attr("a1", "email", "jc@x.org"), attr("a2", "phone", "+33 6 11 22 33 44")],
  });
  const secondary = entity("s", "J. Chevillot", {
    role: "",
    countryIso2: "FR",
    aliases: ["Julien C."],
    attributes: [attr("b1", "email", "JC@X.org", { status: "documented" }), attr("b2", "social", "julienc", { platform: "tiktok" })],
  });
  const plan = planEntityMerge(primary, secondary, KEEP_PRIMARY);
  assert.equal(plan.patch.name, "Julien Chevillot");
  assert.deepEqual(plan.patch.aliases, ["JC", "Julien C.", "J. Chevillot"]);
  assert.equal(plan.patch.role, "Manager");
  assert.equal(plan.patch.countryIso2, "FR");
  assert.equal(plan.patch.attributes.length, 3);
  assert.equal(plan.patch.attributes.find((a) => a.id === "a1")?.status, "documented");
  assert.deepEqual(plan.attributeMap, { b1: "a1" });
  assert.equal(plan.attributesAdded, 1);
  assert.equal(plan.attributesAbsorbed, 1);
});

test("Plan de fusion : le nom de la seconde peut être retenu, l'ancien devient un alias", () => {
  const plan = planEntityMerge(entity("p", "J. C."), entity("s", "Julien Chevillot"), { ...KEEP_PRIMARY, name: "secondary" });
  assert.equal(plan.patch.name, "Julien Chevillot");
  assert.deepEqual(plan.patch.aliases, ["J. C."]);
});

test("Fusion des données : relations déplacées, auto-lien supprimé, doublons réunis, fiches et liens suivis", () => {
  const primary = entity("p", "Julien Chevillot", { attributes: [attr("a1", "email", "jc@x.org")] });
  const secondary = entity("s", "J. Chevillot", { attributes: [attr("b1", "email", "jc@x.org"), attr("b2", "phone", "+33 6 50 49 71 60")] });
  const other = entity("o", "APN");
  const data: InvestigationData = {
    ...emptyInvestigationData(),
    entities: [primary, secondary, other],
    relations: [
      relation("r1", "p", "o", { typeKey: "employed_by", status: "hypothesis", confidence: 40 }),
      relation("r2", "s", "o", { typeKey: "employed_by", status: "documented", confidence: 80 }),
      relation("r3", "p", "s", { typeKey: "possible_duplicate" }),
      relation("r4", "o", "s", { typeKey: "funds" }),
    ],
    notes: [
      note("n-p", "Julien Chevillot", "Fiche principale.", { entityId: "p" }),
      note("n-s", "J. Chevillot", "Infos de la seconde.", { entityId: "s" }),
      note("page-s-mail", "Page e-mail", "Capture du profil.", { attributeRef: { entityId: "s", attributeId: "b1" } }),
      note("page-s-tel", "Page téléphone", "Numéro vu sur un site.", { attributeRef: { entityId: "s", attributeId: "b2" } }),
      note("autre", "Réunion", "Avec [[J. Chevillot]] hier.", { linkedEntityIds: ["s", "o"] }),
    ],
  };
  const merged = applyEntityMerge(data, "p", "s", planEntityMerge(primary, secondary, KEEP_PRIMARY));
  assert.ok(merged);

  assert.deepEqual(merged.entities.map((e) => e.id), ["p", "o"]);
  // r3 (auto-lien) supprimée ; r1 et r2 réunies en une relation documentée de confiance 80 ; r4 déplacée.
  assert.equal(merged.relations.length, 2);
  const employed = merged.relations.find((r) => r.typeKey === "employed_by");
  assert.equal(employed?.status, "documented");
  assert.equal(employed?.confidence, 80);
  assert.equal(merged.relations.find((r) => r.typeKey === "funds")?.targetEntityId, "p");

  // Fiche : la seconde est absorbée, son texte repris sous un intitulé.
  assert.equal(merged.notes.some((n) => n.id === "n-s"), false);
  const fiche = merged.notes.find((n) => n.id === "n-p");
  assert.match(fiche?.body ?? "", /Fusionné depuis « J\. Chevillot »/);
  assert.match(fiche?.body ?? "", /Infos de la seconde\./);

  // Pages de coordonnées : l'e-mail (déjà sur la principale) est repointé sur a1 ;
  // le téléphone, repris tel quel, garde son identifiant.
  assert.deepEqual(merged.notes.find((n) => n.id === "page-s-mail")?.attributeRef, { entityId: "p", attributeId: "a1" });
  assert.deepEqual(merged.notes.find((n) => n.id === "page-s-tel")?.attributeRef, { entityId: "p", attributeId: "b2" });

  // Liens [[…]] et entités liées.
  const meeting = merged.notes.find((n) => n.id === "autre");
  assert.equal(meeting?.body, "Avec [[Julien Chevillot]] hier.");
  assert.deepEqual(meeting?.linkedEntityIds, ["p", "o"]);
});

test("Fusion de pages de coordonnées : deux pages pour la même coordonnée sont réunies", () => {
  const primary = entity("p", "Julien", { attributes: [attr("a1", "email", "jc@x.org")] });
  const secondary = entity("s", "J.", { attributes: [attr("b1", "email", "jc@x.org")] });
  const data: InvestigationData = {
    ...emptyInvestigationData(),
    entities: [primary, secondary],
    notes: [
      note("pp", "Page p", "Notes de p.", { attributeRef: { entityId: "p", attributeId: "a1" } }),
      note("ps", "Page s", "Notes de s.", { attributeRef: { entityId: "s", attributeId: "b1" } }),
    ],
  };
  const merged = applyEntityMerge(data, "p", "s", planEntityMerge(primary, secondary, KEEP_PRIMARY));
  assert.ok(merged);
  assert.equal(merged.notes.length, 1);
  assert.match(merged.notes[0].body, /Notes de p\./);
  assert.match(merged.notes[0].body, /Notes de s\./);
});

test("Fusion impossible : entité absente ou identique", () => {
  const data: InvestigationData = { ...emptyInvestigationData(), entities: [entity("p", "A")] };
  const plan = planEntityMerge(entity("p", "A"), entity("s", "B"), KEEP_PRIMARY);
  assert.equal(applyEntityMerge(data, "p", "s", plan), null);
  assert.equal(applyEntityMerge(data, "p", "p", plan), null);
});
