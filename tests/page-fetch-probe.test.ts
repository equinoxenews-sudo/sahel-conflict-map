import assert from "node:assert/strict";
import test from "node:test";
import { compareProbes, outcomeOf, type ProbeResult } from "../lib/pageFetchProbe";

const page = (url: string, outcome: ProbeResult["outcome"]): ProbeResult => ({
  url, domain: new URL(url).hostname, outcome, httpStatus: outcome === "echec" ? null : outcome === "refus" ? 403 : 200, bodyLength: 0, ms: 1,
});

test("classement d'une page : lue, vide, refus, échec", () => {
  assert.equal(outcomeOf(200, "texte"), "lu");
  assert.equal(outcomeOf(200, "   "), "vide");
  assert.equal(outcomeOf(200, null), "vide");
  assert.equal(outcomeOf(403, null), "refus");
  assert.equal(outcomeOf(null, null), "echec");
  assert.equal(outcomeOf(undefined, null), "echec");
});

test("comparaison : taux, pages perdues ou gagnées, écarts par site", () => {
  const vercel = [page("https://a.fr/1", "lu"), page("https://a.fr/2", "lu"), page("https://b.fr/1", "refus"), page("https://c.fr/1", "lu")];
  const github = [page("https://a.fr/1", "lu"), page("https://a.fr/2", "refus"), page("https://b.fr/1", "lu"), page("https://c.fr/1", "lu")];
  const c = compareProbes(vercel, github);
  assert.equal(c.vercel.rate, 75);
  assert.equal(c.github.rate, 75);
  assert.deepEqual(c.lostOnGithub.map((r) => r.url), ["https://a.fr/2"]);
  assert.deepEqual(c.gainedOnGithub.map((r) => r.url), ["https://b.fr/1"]);
  assert.deepEqual(c.domainGaps.map((d) => d.domain), ["a.fr", "b.fr"]);
});

test("seules les adresses lues des deux côtés sont comparées", () => {
  const c = compareProbes([page("https://a.fr/1", "lu"), page("https://a.fr/2", "lu")], [page("https://a.fr/1", "echec")]);
  assert.equal(c.vercel.pages, 1);
  assert.equal(c.github.pages, 1);
  assert.equal(c.lostOnGithub.length, 1);
});
