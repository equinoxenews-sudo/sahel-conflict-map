import assert from "node:assert/strict";
import test from "node:test";
import { clusterDiameter, clusterDotCanvasSize, clusterDotDiameter, distanceMeters, distinctIds, isColocated } from "../lib/globeClustering";

test("un groupe se forme à partir de 5 événements et son point grandit par paliers de 5", () => {
  assert.equal(clusterDotDiameter(2), 0);
  assert.equal(clusterDotDiameter(4), 0, "moins de 5 : les points restent individuels");
  assert.equal(clusterDotDiameter(5), 26, "5 à 9 : taille du disque « 2 »");
  assert.equal(clusterDotDiameter(9), 26);
  assert.equal(clusterDotDiameter(10), 30, "10 à 14 : taille du disque « 4 »");
  assert.equal(clusterDotDiameter(15), 32, "15 à 19 : taille du disque « 6 »");
  assert.equal(clusterDotDiameter(20), 34, "20 à 24 : taille du disque « 8 »");
  assert.equal(clusterDotDiameter(25), 35, "25 et plus : taille du disque « 10 »");
  for (const count of [5, 50, 500, 5000, 1_000_000]) {
    const d = clusterDotDiameter(count);
    assert.ok(d >= 26 && d <= 42, `${count} → ${d}`);
  }
  assert.equal(clusterDotDiameter(5000), 42, "plafond strict : jamais de grosse bulle");
  for (let count = 5; count < 500; count++) assert.ok(clusterDotDiameter(count + 1) >= clusterDotDiameter(count), "jamais plus petit quand il y a plus d'événements");
});

test("le disque d'un groupe grandit lentement et ne dépasse jamais 42 px", () => {
  assert.equal(clusterDiameter(2), 26);
  assert.ok(clusterDiameter(10) > clusterDiameter(3));
  assert.equal(clusterDiameter(5000), 42);
  assert.ok(clusterDotCanvasSize(26) > 26, "le halo ajoute une marge autour du disque");
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
