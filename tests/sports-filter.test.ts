import test from "node:test";
import assert from "node:assert/strict";
import { isSportsText, isSportsTitle } from "../lib/sportsFilter";
import { parseSituationReport, type SituationInputBrief } from "../lib/situationReport";

test("Les articles de sport sont reconnus", () => {
  assert.ok(isSportsTitle("Irlande - Israël : match nul 1-1 en Ligue des nations"));
  assert.ok(isSportsTitle("L'Irlande bat Israël 3-0"));
  assert.ok(isSportsTitle("Nations League: Ireland draw with Israel"));
  assert.ok(isSportsText("Irlande et Israël terminent sur match nul en Ligue des nations, tensions entre joueurs."));
});

test("Les mots ambigus ne bloquent pas les vrais articles", () => {
  assert.equal(isSportsTitle("Trump promises to match tariffs on Chinese goods"), false);
  assert.equal(isSportsTitle("Supporters of the president rally in Belgrade"), false);
  assert.equal(isSportsTitle("Transfert de technologie militaire entre Ankara et Bamako"), false);
  assert.equal(isSportsTitle("Président Vucic accorde grâce à 49 personnes avant les législatives du 25 octobre"), false);
  assert.equal(isSportsText("Le scrutin de 2024 a été contesté par l'opposition."), false);
});

test("Un événement sportif retenu par le modèle est écarté du point de situation", () => {
  const brief = (id: number, title: string): SituationInputBrief => ({
    id, title, summary: "Résumé.", primary_theme: "civil_unrest", category: null, importance: "medium",
    veracity: "Confirmé", source_domains: ["france24.com"], published_at: "2026-10-04T10:00:00Z", image_url: null,
  });
  const briefs = [brief(1, "Irlande et Israël : match nul en Ligue des nations"), brief(2, "Manifestations à Belgrade")];
  const content = parseSituationReport(
    JSON.stringify({
      title: "Titre",
      conclusion: "Conclusion.",
      items: [
        { briefId: 1, theme: "civil_unrest", date: "2026-10-04", text: "Match nul 1-1 en Ligue des nations." },
        { briefId: 2, theme: "civil_unrest", date: "2026-10-04", text: "Manifestations à Belgrade." },
      ],
    }),
    briefs,
    "europe"
  );
  assert.deepEqual(content.items.map((i) => i.brief_id), [2]);
});
