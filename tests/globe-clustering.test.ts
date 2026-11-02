import assert from "node:assert/strict";
import test from "node:test";
import { clusterDotCanvasSize, clusterDotDiameter, distanceMeters, distinctIds, isColocated } from "../lib/globeClustering";

test("un groupe se forme à partir de 5 événements et son point grandit par paliers de 5, sans jamais être gros", () => {
  assert.equal(clusterDotDiameter(2), 0);
  assert.equal(clusterDotDiameter(4), 0, "moins de 5 : les points restent individuels");
  assert.equal(clusterDotDiameter(5), 10);
  assert.equal(clusterDotDiameter(9), 10);
  assert.equal(clusterDotDiameter(10), 14);
  assert.equal(clusterDotDiameter(15), 16);
  assert.equal(clusterDotDiameter(20), 18);
  assert.equal(clusterDotDiameter(25), 19);
  for (const count of [5, 50, 500, 5000, 1_000_000]) {
    const d = clusterDotDiameter(count);
    assert.ok(d >= 10 && d <= 24, `${count} → ${d}`);
  }
  assert.equal(clusterDotDiameter(5000), 24, "plafond strict : jamais de grosse bulle");
  for (let count = 5; count < 500; count++) assert.ok(clusterDotDiameter(count + 1) >= clusterDotDiameter(count), "jamais plus petit quand il y a plus d'événements");
  assert.ok(clusterDotCanvasSize(10) > 10, "le halo ajoute une marge autour du disque");
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
