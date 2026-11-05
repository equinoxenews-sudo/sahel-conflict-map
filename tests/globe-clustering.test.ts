import assert from "node:assert/strict";
import test from "node:test";
import { explodedAtHeight, clusterDotCanvasSize, clusterDotDiameter, distanceMeters, distinctIds, isColocated, pointStyleFromSearch, ringCanvasSize, ringDiameter, RING_DOUBLE_FROM, BLINK_MS, blinkLevel } from "../lib/globeClustering";

test("un groupe se forme à partir de 5 événements et son point grandit par paliers de 5, sans jamais être gros", () => {
  assert.equal(clusterDotDiameter(2), 0);
  assert.equal(clusterDotDiameter(4), 0, "moins de 5 : les points restent individuels");
  assert.equal(clusterDotDiameter(5), 13);
  assert.equal(clusterDotDiameter(9), 13);
  assert.equal(clusterDotDiameter(10), 18);
  assert.equal(clusterDotDiameter(15), 20);
  assert.equal(clusterDotDiameter(20), 22);
  assert.equal(clusterDotDiameter(25), 23);
  for (const count of [5, 50, 500, 5000, 1_000_000]) {
    const d = clusterDotDiameter(count);
    assert.ok(d >= 13 && d <= 28, `${count} → ${d}`);
  }
  assert.equal(clusterDotDiameter(5000), 28, "plafond strict : jamais de grosse bulle");
  for (let count = 5; count < 500; count++) assert.ok(clusterDotDiameter(count + 1) >= clusterDotDiameter(count), "jamais plus petit quand il y a plus d'événements");
  assert.ok(clusterDotCanvasSize(13) > 13, "le halo ajoute une marge autour du disque");
});

test("deux événements au même lieu ne se séparent jamais ; deux villes distinctes si", () => {
  const bamako = { lat: 12.6392, lon: -8.0029 };
  assert.equal(isColocated([bamako, { ...bamako }, { ...bamako }]), true);
  assert.equal(isColocated([bamako, { lat: 12.6395, lon: -8.0031 }]), true, "quelques dizaines de mètres : même lieu");
  assert.equal(isColocated([bamako, { lat: 12.65, lon: -8.0 }]), false, "plus d'un kilomètre : on peut zoomer pour les séparer");
  assert.equal(isColocated([bamako]), true);
  assert.ok(Math.abs(distanceMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 111_195) < 200, "1° d'arc à l'équateur ≈ 111 km");
});

test("un événement porte deux marqueurs mais ne se compte qu'une fois", () => {
  assert.deepEqual(distinctIds([5, 5, 7, 7, 9]), [5, 7, 9]);
  assert.deepEqual(distinctIds([undefined, null, 3, 3]), [3]);
  assert.deepEqual(distinctIds([]), []);
});

test("au zoom proche les groupes éclatent, avec un écart pour ne pas osciller autour du seuil", () => {
  assert.equal(explodedAtHeight(false, 2_500_000), false, "vue d'une zone : regroupé");
  assert.equal(explodedAtHeight(false, 80_000), true, "vue d'une ville : éclaté");
  assert.equal(explodedAtHeight(false, 600_000), false, "entre les deux seuils, l'état ne change pas");
  assert.equal(explodedAtHeight(true, 600_000), true);
  assert.equal(explodedAtHeight(true, 800_000), false, "on s'éloigne : regroupé de nouveau");
});

test("style anneaux : par défaut sur cette branche d'essai ; ?points=disques rend l'ancien affichage", () => {
  assert.equal(pointStyleFromSearch(""), "anneaux");
  assert.equal(pointStyleFromSearch("?zone=afrique"), "anneaux");
  assert.equal(pointStyleFromSearch("?points=anneaux"), "anneaux");
  assert.equal(pointStyleFromSearch("?evenements-test=1000&points=disques"), "disques");
  assert.equal(pointStyleFromSearch("?points=autre"), "anneaux");
});

test("anneaux : diamètre 20 px à 5 événements, croissance logarithmique, plafond à 48 px, second anneau à partir de 100", () => {
  assert.equal(ringDiameter(4), 0, "moins de 5 : pas de groupe");
  assert.equal(ringDiameter(5), 20);
  assert.equal(ringDiameter(12), 25);
  assert.equal(ringDiameter(30), 31);
  assert.equal(ringDiameter(90), 38);
  assert.equal(ringDiameter(260), 44);
  assert.equal(ringDiameter(640), 48);
  assert.equal(ringDiameter(1_000_000), 48, "plafond strict");
  for (let count = 5; count < 2000; count++) assert.ok(ringDiameter(count + 1) >= ringDiameter(count));
  assert.equal(RING_DOUBLE_FROM, 100);
  assert.ok(ringCanvasSize(48) >= 48 + 2 * 6, "l'image contient le second anneau");
});

test("clignotement lent : toujours entre le plancher et 1, périodique, désynchronisé d'un point à l'autre", () => {
  for (let t = 0; t < 3 * BLINK_MS; t += 37) {
    for (const phase of [0, 0.25, 0.7]) {
      const level = blinkLevel(t, phase);
      assert.ok(level >= 0.35 - 1e-9 && level <= 1 + 1e-9, `${t} / ${phase} → ${level}`);
    }
  }
  assert.ok(Math.abs(blinkLevel(1234, 0.3) - blinkLevel(1234 + BLINK_MS, 0.3)) < 1e-9, "un cycle dure BLINK_MS");
  assert.notEqual(blinkLevel(500, 0).toFixed(3), blinkLevel(500, 0.5).toFixed(3), "deux phases ne battent pas ensemble");
  assert.ok(BLINK_MS >= 2000, "un battement lent");
  const levels = Array.from({ length: 100 }, (_, i) => blinkLevel((i / 100) * BLINK_MS, 0, 0.55));
  assert.ok(Math.min(...levels) >= 0.55 - 1e-9 && Math.max(...levels) <= 1 + 1e-9, "plancher réglable (groupes plus doux)");
});
