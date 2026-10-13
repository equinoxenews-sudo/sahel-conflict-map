import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTO_BACKUP_INTERVAL_MS,
  MAX_AUTO_BACKUPS,
  MAX_MANUAL_BACKUPS,
  backupsToDelete,
  shouldAutoBackup,
  type BackupMeta,
} from "../lib/investigation/backups";

function meta(partial: Partial<BackupMeta> & { id: string; createdAt: string }): BackupMeta {
  return {
    dossierId: "d",
    dossierName: "Dossier",
    kind: "manual",
    entities: 10,
    relations: 5,
    notes: 3,
    sources: 2,
    bytes: 1000,
    ...partial,
  };
}

const NOW = Date.parse("2026-10-13T12:00:00Z");
const hoursAgo = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();
const counts = { entities: 12, relations: 6, notes: 3, sources: 2 };

test("sauvegarde automatique : dossier vide, jamais", () => {
  assert.equal(shouldAutoBackup(null, { entities: 0, relations: 0, notes: 0, sources: 0 }, NOW), false);
});

test("sauvegarde automatique : première sauvegarde d'un dossier rempli", () => {
  assert.equal(shouldAutoBackup(null, counts, NOW), true);
});

test("sauvegarde automatique : pas avant le délai minimal", () => {
  const latest = meta({ id: "a", createdAt: new Date(NOW - AUTO_BACKUP_INTERVAL_MS + 60_000).toISOString() });
  assert.equal(shouldAutoBackup(latest, counts, NOW), false);
});

test("sauvegarde automatique : contenu inchangé, pas de doublon", () => {
  const latest = meta({ id: "a", createdAt: hoursAgo(5), entities: 12, relations: 6, notes: 3, sources: 2 });
  assert.equal(shouldAutoBackup(latest, counts, NOW), false);
});

test("sauvegarde automatique : contenu modifié depuis plus de 3 h", () => {
  const latest = meta({ id: "a", createdAt: hoursAgo(5) });
  assert.equal(shouldAutoBackup(latest, counts, NOW), true);
});

test("sauvegarde automatique : une chute brutale du contenu n'est jamais sauvegardée", () => {
  const latest = meta({ id: "a", createdAt: hoursAgo(10), entities: 40, relations: 30, notes: 10, sources: 5 });
  assert.equal(shouldAutoBackup(latest, { entities: 15, relations: 10, notes: 4, sources: 5 }, NOW), false);
});

test("plafonds : les plus anciennes sauvegardes sont supprimées, par catégorie", () => {
  const autos = Array.from({ length: MAX_AUTO_BACKUPS + 2 }, (_, i) => meta({ id: `auto-${i}`, kind: "auto", createdAt: hoursAgo(i + 1) }));
  const manuals = Array.from({ length: MAX_MANUAL_BACKUPS + 1 }, (_, i) => meta({ id: `man-${i}`, kind: "manual", createdAt: hoursAgo(i + 1) }));
  const toDelete = backupsToDelete([...autos, ...manuals]);
  assert.equal(toDelete.length, 3);
  assert.deepEqual(new Set(toDelete), new Set([`auto-${MAX_AUTO_BACKUPS}`, `auto-${MAX_AUTO_BACKUPS + 1}`, `man-${MAX_MANUAL_BACKUPS}`]));
});

test("plafonds : rien à supprimer sous la limite", () => {
  assert.deepEqual(backupsToDelete([meta({ id: "a", createdAt: hoursAgo(1) })]), []);
});
