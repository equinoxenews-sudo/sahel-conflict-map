import assert from "node:assert/strict";
import test from "node:test";
import { clusterDiameter, distanceMeters, distinctIds, formatClusterCount, isColocated } from "../lib/globeClustering";

test("le nombre d'un groupe est exact jusqu'à 999, puis abrégé sans ambiguïté", () => {
  assert.equal(formatClusterCount(2), "2");
  assert.equal(formatClusterCount(99), "99");
  assert.equal(formatClusterCount(123), "123");
  assert.equal(formatClusterCount(999), "999");
  assert.equal(formatClusterCount(1000), "1 k");
  assert.equal(formatClusterCount(1234), "1,2 k");
  assert.equal(formatClusterCount(5000), "5 k");
});

test("le disque d'un groupe grandit lentement et ne dépasse jamais 42 px", () => {
  assert.equal(clusterDiameter(2), 26);
  assert.ok(clusterDiameter(10) > clusterDiameter(3));
  for (const count of [2, 5, 20, 100, 500, 5000, 1_000_000]) {
    const d = clusterDiameter(count);
    assert.ok(d >= 26 && d <= 42, `${count} → ${d}`);
  }
  assert.equal(clusterDiameter(5000), 42);
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
