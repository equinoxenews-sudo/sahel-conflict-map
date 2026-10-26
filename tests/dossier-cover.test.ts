import assert from "node:assert/strict";
import test from "node:test";
import { isCoverImage } from "../lib/investigation/cover";
import { MAX_PREVIEW_ENTITIES, graphPreview } from "../lib/investigation/graphPreview";
import type { InvestigationEntity, Relation } from "../lib/investigation/types";

function entity(id: string, x: number, y: number, extra: Partial<InvestigationEntity> = {}): InvestigationEntity {
  return { id, dossierId: "d", type: "person", name: id, aliases: [], notes: "", position: { x, y }, createdAt: "", ...extra };
}

function relation(id: string, from: string, to: string, extra: Partial<Relation> = {}): Relation {
  return {
    id,
    dossierId: "d",
    sourceEntityId: from,
    targetEntityId: to,
    label: "",
    status: "documented",
    justifyingSourceId: null,
    confidence: 50,
    createdAt: "",
    ...extra,
  };
}

test("seules les petites images « data: » servent de photo de présentation", () => {
  assert.ok(isCoverImage("data:image/webp;base64,AAAA"));
  assert.ok(isCoverImage("data:image/jpeg;base64,AAAA"));
  assert.ok(!isCoverImage("https://exemple.org/photo.jpg"));
  assert.ok(!isCoverImage("javascript:alert(1)"));
  assert.ok(!isCoverImage("data:image/svg+xml;base64,AAAA"));
  assert.ok(!isCoverImage(undefined));
  assert.ok(!isCoverImage(42));
});

test("un graphe sans fiche n'a pas d'aperçu", () => {
  assert.equal(graphPreview([], []), null);
});

test("l'aperçu englobe toutes les fiches et relie celles qui ont une relation", () => {
  const preview = graphPreview([entity("a", 0, 0), entity("b", 1000, 400)], [relation("r", "a", "b")]);
  assert.ok(preview);
  assert.equal(preview.nodes.length, 2);
  assert.equal(preview.edges.length, 1);
  const { x, y, width, height } = preview.viewBox;
  for (const node of preview.nodes) {
    assert.ok(node.x >= x && node.x + node.width <= x + width);
    assert.ok(node.y >= y && node.y + node.height <= y + height);
  }
});

test("une relation vers une fiche absente ou vers elle-même n'est pas dessinée ; une hypothèse est en pointillés", () => {
  const preview = graphPreview(
    [entity("a", 0, 0), entity("b", 500, 0)],
    [relation("r1", "a", "inconnue"), relation("r2", "a", "a"), relation("r3", "a", "b", { status: "hypothesis" })],
  );
  assert.ok(preview);
  assert.equal(preview.edges.length, 1);
  assert.equal(preview.edges[0].dashed, true);
});

test("une couleur illisible retombe sur l'or, une couleur valide est gardée", () => {
  const preview = graphPreview([entity("a", 0, 0, { borderColor: "rouge" }), entity("b", 500, 0, { borderColor: "#aa3322" })], []);
  assert.ok(preview);
  assert.equal(preview.nodes[0].color, "#e0b44c");
  assert.equal(preview.nodes[1].color, "#aa3322");
});

test("les positions invalides sont ignorées et le nombre de fiches dessinées est borné", () => {
  const many = Array.from({ length: MAX_PREVIEW_ENTITIES + 40 }, (_, i) => entity(`e${i}`, i * 10, 0));
  const preview = graphPreview([entity("nan", Number.NaN, 0), ...many], []);
  assert.ok(preview);
  assert.equal(preview.nodes.length, MAX_PREVIEW_ENTITIES);
  assert.equal(graphPreview([entity("nan", Number.NaN, 0)], []), null);
});
