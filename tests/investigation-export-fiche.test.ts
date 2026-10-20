import assert from "node:assert/strict";
import test from "node:test";
import { ficheFileName } from "../lib/investigation/exportFiche";

test("nom de fichier d'une fiche : sans accents ni caractères spéciaux, avec la date", () => {
  const day = new Date("2026-10-20T10:00:00Z");
  assert.equal(ficheFileName("Marie-Michaire Lima", day), "marie-michaire-lima-2026-10-20.png");
  assert.equal(ficheFileName("Centre de formation APN D'ALFAKOUARA", day), "centre-de-formation-apn-d-alfakouara-2026-10-20.png");
  assert.equal(ficheFileName("Ouloufémi Germaine Dégnon", day), "oulofemi-germaine-degnon-2026-10-20.png".replace("oulofemi", "ouloufemi"));
  assert.equal(ficheFileName("???", day), "fiche-2026-10-20.png");
});
