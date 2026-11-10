// Tests d'INTÉGRATION des notifications par e-mail : base de PRÉPRODUCTION seulement. AUCUN e-mail réel : le fournisseur est simulé
// (il enregistre ce qu'il aurait envoyé), aucun appel réseau, aucune IA.
//   npm run test:staging
// Il faut avoir exécuté supabase/supervision-lot8-alerts.sql et supabase/supervision-lot9-notifications.sql dans la préproduction.
// Chaque test ne touche que SES Supervisions (option `only`) : aucune notification réelle n'est jamais traitée par ces tests.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { setAlertStates } from "../../lib/supervision/alerts/store";
import { initialScope } from "../../lib/supervision/core/scope";
import * as store from "../../lib/supervision/core/store";
import type { EmailProvider, OutgoingEmail, SendResult } from "../../lib/supervision/notify/provider";
import { emptyReport, queueAlerts, requestConfirmation, requestTest, sendDue, type NotifyDeps } from "../../lib/supervision/notify/run";
import { alertKey } from "../../lib/supervision/notify/rules";
import { confirmRecipient, getRules, listJournal, setRules } from "../../lib/supervision/notify/store";
import { verifyConfirmToken } from "../../lib/supervision/notify/token";

const STAGING_PROJECT_REF = "upoknwoctatqmlonitzx";
dotenv.config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
})();
const skip = !url || !serviceKey ? "Variables Supabase absentes de .env.local." : host.split(".")[0] !== STAGING_PROJECT_REF ? `Base « ${host} » : ce n'est PAS la préproduction, tests refusés.` : false;
const admin = skip ? null : createClient(url, serviceKey, { auth: { persistSession: false } });
const runId = Math.random().toString(36).slice(2, 8);
const owners: string[] = [];

// Fournisseur simulé : enregistre les messages et répond selon un scénario.
class FakeProvider implements EmailProvider {
  readonly name = "dry_run" as const;
  readonly sent: OutgoingEmail[] = [];
  constructor(private readonly behaviour: (n: number) => SendResult = () => ({ ok: true, id: "fake", dryRun: true })) {}
  async send(message: OutgoingEmail): Promise<SendResult> {
    this.sent.push(message);
    return this.behaviour(this.sent.length);
  }
}

const T0 = new Date("2026-11-10T09:00:00Z");
const minutes = (count: number) => new Date(T0.getTime() + count * 60_000);
const EMAIL = "essai@exemple.fr";

const deps = (provider: EmailProvider, now: Date = T0): NotifyDeps => ({ db: admin! as never, provider, now, siteUrl: "https://equinoxe.test", secret: "secret-de-test" });

before(async () => {
  if (skip || !admin) return;
  for (const table of ["sv_notification_rules", "sv_email_outbox", "sv_alert_states"]) {
    const { error } = await admin.from(table).select("*", { head: true, count: "exact" }).limit(1);
    if (error) throw new Error(`La préproduction n'a pas la table ${table} (${error.message}). Exécute supabase/supervision-lot8-alerts.sql puis supervision-lot9-notifications.sql dans le SQL Editor de equinoxe-staging.`);
  }
});

after(async () => {
  if (!admin) return;
  for (const id of owners) {
    await admin.from("sv_operation_ledger").delete().eq("owner_id", id);
    await admin.from("sv_supervisions").delete().eq("owner_id", id); // les règles, la file et les décisions partent avec (cascade)
  }
});

/** Supervision active (Nigeria, données publiques de l'échantillon) dont les notifications sont activées et l'adresse confirmée. */
async function ready(owner: string, name: string, options: { levels?: ("critique" | "importante")[]; digest?: "off" | "daily" | "weekly"; verify?: boolean; enabledAt?: Date } = {}): Promise<string> {
  owners.push(owner);
  const created = await store.createDraft(owner, name, initialScope({ name, country: "NGA", objective: "securite" }));
  assert.ok(created.ok, JSON.stringify(created));
  if (!created.ok) throw new Error("brouillon non créé");
  const id = created.supervision_id;
  await admin!.from("sv_supervisions").update({ state: "active" }).eq("id", id);
  // Activées « avant » l'historique de l'échantillon : les alertes réelles de la période sont éligibles.
  const set = await setRules(owner, id, { enabled: true, immediateLevels: options.levels ?? ["critique"], digest: options.digest ?? "off", recipient: EMAIL }, options.enabledAt ?? new Date("2026-10-01T00:00:00Z"), admin! as never);
  assert.ok(set.ok, JSON.stringify(set));
  if (options.verify !== false) assert.ok((await confirmRecipient(id, EMAIL, T0, admin! as never)).ok);
  return id;
}

const rows = async (id: string, status?: string) => {
  let query = admin!.from("sv_email_outbox").select("id, kind, status, dedupe_key, attempts, error, subject, payload").eq("supervision_id", id).order("created_at");
  if (status) query = query.eq("status", status);
  return (await query).data ?? [];
};

test("parcours complet : mise en file, doublons refusés, temporisation, UN message groupé, journal, rien de renvoyé", { skip }, async () => {
  const o = `it-notify-${runId}-a`;
  const id = await ready(o, "Veille notif A");
  const provider = new FakeProvider();

  const first = emptyReport();
  await queueAlerts(deps(provider), first, { only: [id] });
  assert.ok(first.queued > 1, `des alertes critiques réelles sont mises en file : ${first.queued}`);
  const queuedRows = await rows(id, "pending");
  assert.equal(queuedRows.length, first.queued);
  assert.ok(queuedRows.every((row) => row.kind === "immediate" && String(row.dedupe_key).startsWith("alert:")));

  // Rejouer la tâche ne duplique rien.
  const again = emptyReport();
  await queueAlerts(deps(provider), again, { only: [id] });
  assert.equal(again.queued, 0);
  assert.equal((await rows(id)).length, first.queued);

  // Temporisation : à T0 rien n'est dû, 11 minutes plus tard tout part dans UN seul message.
  const early = emptyReport();
  await sendDue(deps(provider), early, { only: [id] });
  assert.equal(provider.sent.length, 0, "rien avant la fin de la temporisation");
  const late = emptyReport();
  await sendDue(deps(provider, minutes(11)), late, { only: [id] });
  assert.equal(provider.sent.length, 1, "toutes les alertes de la fenêtre dans un seul e-mail");
  assert.equal(late.dryRun, first.queued);
  const mail = provider.sent[0];
  assert.equal(mail.to, EMAIL);
  assert.match(mail.subject, /^\[Équinoxe\] \d+ nouvelles? alertes? dont \d+ critiques? — Veille notif A$/);
  assert.match(mail.text, /Une alerte n'est pas une preuve/);
  assert.match(mail.text, /\/mon-espace\/supervision\//);
  assert.equal(mail.idempotencyKey.startsWith("ob-"), true);

  const done = await rows(id);
  assert.ok(done.every((row) => row.status === "dry_run" && row.subject === mail.subject));
  const journal = await listJournal(o, id, 50, admin! as never);
  assert.equal(journal?.length, first.queued);

  // Plus rien à envoyer ensuite.
  await sendDue(deps(provider, minutes(60)), emptyReport(), { only: [id] });
  assert.equal(provider.sent.length, 1);
});

test("pause ou lecture seule après la mise en file : les messages en attente sont annulés, rien ne part", { skip }, async () => {
  const o = `it-notify-${runId}-b`;
  const id = await ready(o, "Veille notif B");
  const provider = new FakeProvider();
  const report = emptyReport();
  await queueAlerts(deps(provider), report, { only: [id] });
  assert.ok(report.queued > 0);

  await admin!.from("sv_supervisions").update({ state: "paused" }).eq("id", id);
  const sent = emptyReport();
  await sendDue(deps(provider, minutes(15)), sent, { only: [id] });
  assert.equal(provider.sent.length, 0, "une Supervision en pause n'envoie rien");
  assert.equal(sent.skipped, report.queued);
  const skipped = await rows(id, "skipped");
  assert.equal(skipped.length, report.queued);
  assert.match(String(skipped[0].error), /non active \(paused\)/);

  // Une Supervision qui n'est plus active ne met plus rien en file non plus.
  const later = emptyReport();
  await queueAlerts(deps(provider, minutes(30)), later, { only: [id] });
  assert.equal(later.queued, 0);
  assert.equal(later.supervisions, 0);
});

test("adresse non confirmée, notifications coupées, niveaux vides : rien n'est mis en file ; changer d'adresse annule la confirmation", { skip }, async () => {
  const o = `it-notify-${runId}-c`;
  const id = await ready(o, "Veille notif C", { verify: false });
  const provider = new FakeProvider();
  const unverified = emptyReport();
  await queueAlerts(deps(provider), unverified, { only: [id] });
  assert.equal(unverified.queued, 0, "adresse non confirmée : aucun message");

  assert.ok((await confirmRecipient(id, EMAIL, T0, admin! as never)).ok);
  assert.equal((await getRules(o, id, admin! as never))?.recipientVerified, true);
  const changed = await setRules(o, id, { enabled: true, immediateLevels: ["critique"], digest: "off", recipient: "autre@exemple.fr" }, T0, admin! as never);
  assert.ok(changed.ok && !changed.rules.recipientVerified, "une nouvelle adresse doit être confirmée à son tour");
  const same = await setRules(o, id, { enabled: true, immediateLevels: ["critique"], digest: "off", recipient: "autre@exemple.fr" }, T0, admin! as never);
  assert.ok(same.ok && !same.rules.recipientVerified, "enregistrer sans changer l'adresse ne la confirme pas");

  await setRules(o, id, { enabled: false, immediateLevels: [], digest: "off", recipient: EMAIL }, T0, admin! as never);
  assert.ok((await confirmRecipient(id, EMAIL, T0, admin! as never)).ok);
  const off = emptyReport();
  await queueAlerts(deps(provider), off, { only: [id] });
  assert.equal(off.queued, 0, "notifications désactivées : aucun message");
});

test("une alerte déjà tranchée par l'utilisateur n'est pas envoyée ; les niveaux choisis sont respectés", { skip }, async () => {
  const o = `it-notify-${runId}-d`;
  const id = await ready(o, "Veille notif D", { levels: ["critique"] });
  const provider = new FakeProvider();
  const probe = emptyReport();
  await queueAlerts(deps(provider), probe, { only: [id] });
  const keys = (await rows(id)).map((row) => String(row.dedupe_key));
  assert.ok(keys.length >= 2);
  assert.ok(keys.every((key) => key.endsWith(":critique")), "seuls les critiques : aucun niveau « importante »");

  // Même Supervision, repartie de zéro : on tranche la première alerte avant la mise en file.
  await admin!.from("sv_email_outbox").delete().eq("supervision_id", id);
  const first = keys[0].replace(/^alert:/, "").replace(/:critique$/, "");
  await setAlertStates(o, id, "read", [{ eventRef: first, level: "critique" }], {}, admin! as never);
  const second = emptyReport();
  await queueAlerts(deps(provider, minutes(1)), second, { only: [id] });
  const keys2 = (await rows(id)).map((row) => String(row.dedupe_key));
  assert.equal(keys2.includes(alertKey(first, "critique")), false, "l'alerte lue n'est pas envoyée");
  assert.equal(keys2.length, keys.length - 1);
});

test("activer les notifications ne rejoue pas l'historique : seules les alertes plus récentes que l'activation partent", { skip }, async () => {
  const o = `it-notify-${runId}-e`;
  const id = await ready(o, "Veille notif E", { enabledAt: new Date("2030-01-01T00:00:00Z") });
  const provider = new FakeProvider();
  const report = emptyReport();
  await queueAlerts(deps(provider), report, { only: [id] });
  assert.equal(report.queued, 0, "activées dans le futur par rapport aux données : aucune alerte éligible");
});

test("digest : aucun message sans alerte dans la période ; sinon un seul par jour, mis en file une fois, envoyé en un message", { skip }, async () => {
  const o = `it-notify-${runId}-f`;
  const id = await ready(o, "Veille notif F", { levels: [], digest: "daily" });
  const provider = new FakeProvider();

  // Les dernières alertes de l'échantillon datent du 8 novembre : le 10 au matin, les dernières 24 h n'en contiennent aucune.
  const quiet = emptyReport();
  await queueAlerts(deps(provider, new Date("2026-11-10T08:00:00Z")), quiet, { only: [id] });
  assert.equal(quiet.digests, 0, "aucune alerte sur la période : aucun digest");
  assert.equal((await rows(id)).length, 0);

  // Le 8 novembre à 21 h (Paris), les dernières 24 h contiennent des alertes du matin.
  const evening = new Date("2026-11-08T20:00:00Z");
  const first = emptyReport();
  await queueAlerts(deps(provider, evening), first, { only: [id] });
  assert.equal(first.digests, 1);
  assert.equal(first.queued, 0, "pas d'e-mail immédiat : seulement le digest");
  const again = emptyReport();
  await queueAlerts(deps(provider, new Date(evening.getTime() + 3_600_000)), again, { only: [id] });
  assert.equal(again.digests, 0, "un seul digest par jour");

  await sendDue(deps(provider, evening), emptyReport(), { only: [id] });
  assert.equal(provider.sent.length, 1);
  assert.match(provider.sent[0].subject, /^\[Équinoxe\] Digest quotidien — \d+ alertes? — Veille notif F$/);
  assert.equal((await rows(id, "dry_run")).length, 1);

  // Avant 7 h à Paris le lendemain : rien n'est dû ; ensuite, le digest du jour suivant (les alertes du 8 au matin sont encore dans les 24 h).
  const early = emptyReport();
  await queueAlerts(deps(provider, new Date("2026-11-09T05:00:00Z")), early, { only: [id] });
  assert.equal(early.digests, 0);
  const nextDay = emptyReport();
  await queueAlerts(deps(provider, new Date("2026-11-09T06:30:00Z")), nextDay, { only: [id] });
  assert.equal(nextDay.digests, 1, "le lendemain, le digest du jour suivant");
});

test("échecs du fournisseur : réessayable puis abandon à la 3e tentative ; définitif tout de suite ; le journal garde la raison", { skip }, async () => {
  const o = `it-notify-${runId}-g`;
  const id = await ready(o, "Veille notif G");
  const flaky = new FakeProvider(() => ({ ok: false, error: "Resend 503", retryable: true }));
  await queueAlerts(deps(flaky), emptyReport(), { only: [id] });
  const total = (await rows(id)).length;
  assert.ok(total > 0);

  for (const attempt of [1, 2, 3]) {
    const report = emptyReport();
    await sendDue(deps(flaky, minutes(11 + attempt * 20)), report, { only: [id] });
    assert.equal(flaky.sent.length, attempt, `tentative ${attempt}`);
  }
  const failed = await rows(id, "failed");
  assert.equal(failed.length, total, "abandonnés après 3 tentatives");
  assert.ok(failed.every((row) => row.attempts === 3 && row.error === "Resend 503"));
  await sendDue(deps(flaky, minutes(200)), emptyReport(), { only: [id] });
  assert.equal(flaky.sent.length, 3, "un message abandonné n'est plus tenté");

  // Échec définitif (adresse refusée) : pas de nouvelle tentative.
  const o2 = `it-notify-${runId}-g2`;
  const id2 = await ready(o2, "Veille notif G2");
  const refusing = new FakeProvider(() => ({ ok: false, error: "Resend 422 validation_error", retryable: false }));
  await queueAlerts(deps(refusing), emptyReport(), { only: [id2] });
  await sendDue(deps(refusing, minutes(11)), emptyReport(), { only: [id2] });
  assert.equal((await rows(id2, "pending")).length, 0);
  assert.ok((await rows(id2, "failed")).length > 0);
  await sendDue(deps(refusing, minutes(60)), emptyReport(), { only: [id2] });
  assert.equal(refusing.sent.length, 1);
});

test("deux tâches simultanées ne réservent jamais le même message : un seul envoi", { skip }, async () => {
  const o = `it-notify-${runId}-h`;
  const id = await ready(o, "Veille notif H");
  const provider = new FakeProvider();
  await queueAlerts(deps(provider), emptyReport(), { only: [id] });
  await Promise.all([1, 2, 3].map(() => sendDue(deps(provider, minutes(11)), emptyReport(), { only: [id] })));
  assert.equal(provider.sent.length, 1, "un seul message groupé malgré trois tâches simultanées");
});

test("confirmation de l'adresse : lien signé envoyé une fois toutes les 10 minutes, valable une fois, annulé si l'adresse a changé", { skip }, async () => {
  const o = `it-notify-${runId}-i`;
  const id = await ready(o, "Veille notif I", { verify: false });
  const provider = new FakeProvider();

  const sent = await requestConfirmation(o, id, deps(provider));
  assert.deepEqual(sent, { ok: true });
  assert.equal(provider.sent.length, 1);
  const link = provider.sent[0].text.match(/https:\/\/equinoxe\.test\/api\/supervision-notify\/confirm\?token=([^\s]+)/);
  assert.ok(link, provider.sent[0].text);
  const token = decodeURIComponent(link![1]);
  const check = verifyConfirmToken(token, "secret-de-test", T0);
  assert.ok(check.ok && check.supervisionId === id && check.email === EMAIL);

  const tooSoon = await requestConfirmation(o, id, deps(provider, minutes(5)));
  assert.deepEqual(tooSoon, { ok: false, code: "too_soon", retryAfterSeconds: 600 });
  assert.equal(provider.sent.length, 1);

  assert.deepEqual(await confirmRecipient(id, EMAIL, T0, admin! as never), { ok: true, confirmed: true });
  assert.deepEqual(await confirmRecipient(id, EMAIL, T0, admin! as never), { ok: true, confirmed: false }, "un second clic ne change rien");
  assert.deepEqual(await confirmRecipient(id, "autre@exemple.fr", T0, admin! as never), { ok: false }, "une autre adresse n'est jamais confirmée");

  await setRules(o, id, { enabled: true, immediateLevels: ["critique"], digest: "off", recipient: "nouvelle@exemple.fr" }, T0, admin! as never);
  assert.deepEqual(await confirmRecipient(id, EMAIL, T0, admin! as never), { ok: false }, "un ancien lien ne confirme plus l'adresse changée");
  assert.equal((await getRules(o, id, admin! as never))?.recipientVerified, false);

  const noRecipient = await setRules(o, id, { enabled: false, immediateLevels: [], digest: "off", recipient: null }, T0, admin! as never);
  assert.ok(noRecipient.ok);
  assert.deepEqual(await requestConfirmation(o, id, deps(provider, minutes(30))), { ok: false, code: "no_recipient" });
});

test("e-mail de test : seulement vers une adresse confirmée, une demande toutes les 2 minutes", { skip }, async () => {
  const o = `it-notify-${runId}-j`;
  const id = await ready(o, "Veille notif J", { verify: false });
  const provider = new FakeProvider();
  assert.deepEqual(await requestTest(o, id, deps(provider)), { ok: false, code: "not_verified" });
  assert.equal(provider.sent.length, 0);
  await confirmRecipient(id, EMAIL, T0, admin! as never);
  assert.deepEqual(await requestTest(o, id, deps(provider)), { ok: true });
  assert.equal(provider.sent.length, 1);
  assert.match(provider.sent[0].subject, /Test des notifications — Veille notif J/);
  assert.deepEqual(await requestTest(o, id, deps(provider, minutes(1))), { ok: false, code: "too_soon", retryAfterSeconds: 120 });
  assert.deepEqual(await requestTest(o, id, deps(provider, minutes(3))), { ok: true });
  assert.equal(provider.sent.length, 2);
});

test("isolation et lecture seule : un autre compte ne lit ni ne modifie rien ; la lecture seule refuse toute modification", { skip }, async () => {
  const alice = `it-notify-${runId}-k1`;
  const bob = `it-notify-${runId}-k2`;
  const id = await ready(alice, "Veille notif K");
  owners.push(bob);
  const provider = new FakeProvider();

  assert.equal(await getRules(bob, id, admin! as never), null);
  assert.equal(await listJournal(bob, id, 10, admin! as never), null);
  const intrusion = await setRules(bob, id, { enabled: false, immediateLevels: [], digest: "off", recipient: null }, T0, admin! as never);
  assert.ok(!intrusion.ok && intrusion.code === "not_found");
  assert.deepEqual(await requestConfirmation(bob, id, deps(provider)), { ok: false, code: "not_found" });
  assert.deepEqual(await requestTest(bob, id, deps(provider)), { ok: false, code: "not_found" });
  assert.equal((await getRules(alice, id, admin! as never))?.recipient, EMAIL);

  await admin!.from("sv_supervisions").update({ state: "read_only_grace" }).eq("id", id);
  const locked = await setRules(alice, id, { enabled: false, immediateLevels: [], digest: "off", recipient: EMAIL }, T0, admin! as never);
  assert.ok(!locked.ok && locked.code === "read_only");
  assert.deepEqual(await requestTest(alice, id, deps(provider)), { ok: false, code: "read_only" });
  assert.ok((await getRules(alice, id, admin! as never)) !== null, "lecture permise");
});

test("les préférences et la file ne sont ni lisibles ni écrivables avec les clés publiques de la base (RLS)", { skip }, async () => {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(anon, "clé publique attendue dans .env.local pour ce test");
  const client = createClient(url, anon!, { auth: { persistSession: false } });
  for (const table of ["sv_notification_rules", "sv_email_outbox"]) {
    const read = await client.from(table).select("*").limit(1);
    assert.ok(read.error || (read.data ?? []).length === 0, `${table} : aucune ligne lisible`);
  }
  const nobody = "00000000-0000-0000-0000-000000000000";
  const calls = await Promise.all([
    client.rpc("sv_set_notification_rules", { p_owner: "x", p_supervision_id: nobody, p_enabled: false, p_levels: [], p_digest: "off", p_recipient: null }),
    client.rpc("sv_confirm_recipient", { p_supervision_id: nobody, p_email: EMAIL }),
    client.rpc("sv_enqueue_email", { p_supervision_id: nobody, p_kind: "test", p_dedupe_key: "k", p_to: EMAIL, p_payload: {}, p_send_after: T0.toISOString() }),
    client.rpc("sv_claim_due_emails", { p_limit: 10 }),
    client.rpc("sv_finish_email", { p_id: nobody, p_status: "sent", p_provider_id: null, p_error: null, p_subject: null }),
  ]);
  for (const call of calls) assert.ok(call.error, "fonction non exécutable avec la clé publique");
});
