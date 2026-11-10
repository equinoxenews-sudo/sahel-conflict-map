import assert from "node:assert/strict";
import test from "node:test";
import type { Alert, StoredDecision } from "../lib/supervision/alerts/rules";
import type { BoardEvent } from "../lib/supervision/dashboard/fixtures";
import { confirmationEmail, digestEmail, escapeHtml, immediateEmail, oneLine, testEmail } from "../lib/supervision/notify/message";
import { AllowListProvider, DEFAULT_FROM, DryRunProvider, ResendProvider, STAGING_PROJECT_REF, chooseProvider, isStagingDatabase, testRecipients, type FetchLike } from "../lib/supervision/notify/provider";
import { ALERTS_PER_EMAIL_MAX, ENQUEUE_PER_RUN_MAX, alertKey, canNotify, digestDue, isEmail, notifyMessage, selectAlertsToQueue, validateRules, type NotificationRules, type QueuedAlert } from "../lib/supervision/notify/rules";
import { signConfirmToken, verifyConfirmToken } from "../lib/supervision/notify/token";

const NOW = new Date("2026-11-10T12:00:00Z");

const alert = (id: string, level: "critique" | "importante", at = "2026-11-10T10:00:00Z", title = `Événement ${id}`): Alert => {
  const event: BoardEvent = { id, kind: "article", title, theme: "securite", priority: level, verification: "signalement", at, place: "Nigeria", publications: 1, url: `https://example.com/${id}` };
  return { id, level, event, why: "Article analysé d'importance haute." };
};

const rules = (extra: Partial<NotificationRules> = {}): NotificationRules => ({ enabled: true, immediateLevels: ["critique"], digest: "off", recipient: "moi@exemple.fr", recipientVerified: true, enabledAt: "2026-11-09T00:00:00Z", ...extra });

const queued = (id: string, level: "critique" | "importante" = "critique", extra: Partial<QueuedAlert> = {}): QueuedAlert => ({ eventRef: id, level, title: `Événement ${id}`, at: "2026-11-10T10:00:00Z", place: "Nigeria", verification: "signalement", qualifier: null, url: `https://example.com/${id}`, why: "Article analysé d'importance haute.", ...extra });

// --- Préférences --------------------------------------------------------------------------------------------------------------

test("adresse e-mail : une seule adresse simple ; espaces, noms affichés, virgules et caractères de contrôle refusés", () => {
  for (const ok of ["moi@exemple.fr", "prenom.nom+veille@sous.domaine.org"]) assert.ok(isEmail(ok), ok);
  for (const bad of ["", "moi", "moi@exemple", "moi@@exemple.fr", "a b@exemple.fr", "Moi <moi@exemple.fr>", "a@exemple.fr, b@exemple.fr", "a@exemple.fr\nBcc: x@y.fr", "a@exemple.fr;b@y.fr", `${"x".repeat(250)}@exemple.fr`, 12, null]) assert.equal(isEmail(bad), false, String(bad));
});

test("préférences : activer exige une adresse et un niveau ou un digest ; les niveaux inconnus sont refusés ; l'adresse est mise en minuscules", () => {
  const ok = validateRules({ enabled: true, immediateLevels: ["importante", "critique", "critique"], digest: "daily", recipient: "  Moi@Exemple.FR " });
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual(ok.value, { enabled: true, immediateLevels: ["critique", "importante"], digest: "daily", recipient: "moi@exemple.fr" });
  assert.equal(validateRules({ enabled: true, immediateLevels: ["critique"], digest: "off", recipient: "" }).ok, false, "adresse requise");
  assert.equal(validateRules({ enabled: true, immediateLevels: [], digest: "off", recipient: "moi@exemple.fr" }).ok, false, "niveau ou digest requis");
  assert.ok(validateRules({ enabled: true, immediateLevels: [], digest: "weekly", recipient: "moi@exemple.fr" }).ok, "un digest seul suffit");
  assert.equal(validateRules({ enabled: true, immediateLevels: ["information"], digest: "off", recipient: "moi@exemple.fr" }).ok, false, "« information » ne déclenche jamais");
  assert.equal(validateRules({ enabled: true, immediateLevels: ["critique"], digest: "hourly", recipient: "moi@exemple.fr" }).ok, false);
  assert.equal(validateRules({ enabled: "oui" }).ok, false);
  assert.equal(validateRules(null).ok, false);
  const off = validateRules({ enabled: false, immediateLevels: [], digest: "off" });
  assert.ok(off.ok, "désactiver ne demande rien");
});

test("seule une Supervision active, aux notifications activées et à l'adresse confirmée, peut notifier", () => {
  assert.ok(canNotify("active", rules()));
  for (const state of ["draft", "initializing", "paused", "error", "read_only_grace", "pending_deletion", "deleted"]) assert.equal(canNotify(state, rules()), false, state);
  assert.equal(canNotify("active", rules({ enabled: false })), false);
  assert.equal(canNotify("active", rules({ recipientVerified: false })), false);
  assert.equal(canNotify("active", rules({ recipient: null })), false);
});

// --- Sélection des alertes à envoyer -------------------------------------------------------------------------------------------

test("alertes à mettre en file : niveau choisi, plus récentes que l'activation, pas déjà tranchées, pas déjà en file", () => {
  const alerts = [alert("a-1", "critique"), alert("a-2", "importante"), alert("a-3", "critique", "2026-11-08T10:00:00Z"), alert("a-4", "critique"), alert("a-5", "critique")];
  const decisions = new Map<string, StoredDecision>([["a-4", { status: "read", level: "critique" }]]);
  const already = new Set([alertKey("a-5", "critique")]);
  const picked = selectAlertsToQueue(alerts, rules(), decisions, already);
  assert.deepEqual(picked.map((a) => a.eventRef), ["a-1"], "a-2 : niveau non choisi ; a-3 : avant l'activation ; a-4 : déjà lue ; a-5 : déjà en file");
  const both = selectAlertsToQueue(alerts, rules({ immediateLevels: ["critique", "importante"] }), decisions, already);
  assert.deepEqual(both.map((a) => a.eventRef), ["a-1", "a-2"]);
});

test("une décision prise sur un niveau plus bas ne vaut pas pour une alerte montée : elle repart, sous une autre clé", () => {
  const decisions = new Map<string, StoredDecision>([["a-1", { status: "hidden", level: "importante" }]]);
  const escalated = selectAlertsToQueue([alert("a-1", "critique")], rules(), decisions, new Set([alertKey("a-1", "importante")]));
  assert.deepEqual(escalated.map((a) => [a.eventRef, a.level]), [["a-1", "critique"]]);
  assert.notEqual(alertKey("a-1", "importante"), alertKey("a-1", "critique"));
});

test("sans activation, sans niveau ou sans date d'activation : rien n'est mis en file ; une rafale est plafonnée", () => {
  const alerts = [alert("a-1", "critique")];
  assert.deepEqual(selectAlertsToQueue(alerts, rules({ enabled: false }), new Map(), new Set()), []);
  assert.deepEqual(selectAlertsToQueue(alerts, rules({ immediateLevels: [] }), new Map(), new Set()), []);
  assert.deepEqual(selectAlertsToQueue(alerts, rules({ enabledAt: null }), new Map(), new Set()), [], "sans date d'activation, l'historique ne part jamais");
  const burst = Array.from({ length: ENQUEUE_PER_RUN_MAX + 10 }, (_, n) => alert(`a-${n}`, "critique"));
  assert.equal(selectAlertsToQueue(burst, rules(), new Map(), new Set()).length, ENQUEUE_PER_RUN_MAX);
});

test("digest : quotidien dû chaque jour à partir de 7 h (Paris), hebdomadaire une seule fois par semaine ISO, jamais sans demande", () => {
  assert.equal(digestDue("off", NOW), null);
  assert.equal(digestDue("daily", new Date("2026-11-10T05:59:00Z")), null, "6 h 59 à Paris (heure d'hiver)");
  assert.deepEqual(digestDue("daily", new Date("2026-11-10T06:00:00Z")), { key: "digest:daily:2026-11-10", days: 1, label: "quotidien" });
  assert.equal(digestDue("daily", new Date("2026-07-10T04:59:00Z")), null, "6 h 59 à Paris (heure d'été)");
  assert.equal(digestDue("daily", new Date("2026-07-10T05:00:00Z"))?.key, "digest:daily:2026-07-10");
  // Lundi 9 novembre 2026 : semaine ISO 46. Avant 7 h le lundi, rien ; ensuite et toute la semaine, la même clé.
  assert.equal(digestDue("weekly", new Date("2026-11-09T05:00:00Z")), null);
  const monday = digestDue("weekly", new Date("2026-11-09T06:30:00Z"));
  assert.deepEqual(monday, { key: "digest:weekly:2026-W46", days: 7, label: "hebdomadaire" });
  assert.equal(digestDue("weekly", new Date("2026-11-12T09:00:00Z"))?.key, "digest:weekly:2026-W46", "lundi manqué : parti dès que possible, une seule fois");
  assert.equal(digestDue("weekly", new Date("2026-11-16T06:30:00Z"))?.key, "digest:weekly:2026-W47");
  assert.equal(digestDue("weekly", new Date("2026-12-31T12:00:00Z"))?.key, "digest:weekly:2026-W53");
  assert.equal(digestDue("weekly", new Date("2027-01-01T12:00:00Z"))?.key, "digest:weekly:2026-W53", "1er janvier 2027 : encore la semaine 53 de 2026");
});

test("messages d'erreur : chaque code connu a sa phrase, un code inconnu ne montre jamais un code brut", () => {
  assert.match(notifyMessage("too_soon", { retry_after_seconds: 600 }), /10 minute/);
  for (const code of ["read_only", "not_found", "invalid_input", "no_recipient", "not_verified", "locked", "forbidden"]) {
    const text = notifyMessage(code);
    assert.ok(text.length > 10 && !text.includes(code), code);
  }
  assert.equal(notifyMessage("inattendu"), "L'opération a échoué. Réessaie dans un instant.");
});

// --- Texte des e-mails --------------------------------------------------------------------------------------------------------

test("e-mail immédiat : objet chiffré avec les critiques, alertes triées dans le texte et le HTML, rappel « pas une preuve », lien de gestion", () => {
  const mail = immediateEmail({ supervisionName: "Test Nigeria", supervisionUrl: "https://equinoxe.news/mon-espace/supervision/abc", alerts: [queued("a-1"), queued("a-2", "importante"), queued("a-3")] });
  assert.equal(mail.subject, "[Équinoxe] 3 nouvelles alertes dont 2 critiques — Test Nigeria");
  assert.match(mail.text, /\[CRITIQUE\] Événement a-1/);
  assert.match(mail.text, /\[IMPORTANTE\] Événement a-2/);
  assert.match(mail.text, /Origine du classement : Article analysé/);
  assert.match(mail.text, /Source : example\.com — https:\/\/example\.com\/a-1/);
  assert.match(mail.text, /Une alerte n'est pas une preuve/);
  assert.match(mail.text, /Gérer les notifications : https:\/\/equinoxe\.news\/mon-espace\/supervision\/abc/);
  assert.match(mail.html, /<!doctype html>/);
  assert.match(mail.html, /Gérer les notifications/);
  const single = immediateEmail({ supervisionName: "Veille", supervisionUrl: "https://x.test/", alerts: [queued("a-1", "importante")] });
  assert.equal(single.subject, "[Équinoxe] 1 nouvelle alerte — Veille", "singulier, sans « dont »");
});

test("e-mail : plafond d'alertes listées, le reste est annoncé par un nombre", () => {
  const many = Array.from({ length: ALERTS_PER_EMAIL_MAX + 4 }, (_, n) => queued(`a-${n}`));
  const mail = immediateEmail({ supervisionName: "Veille", supervisionUrl: "https://x.test/", alerts: many });
  assert.equal((mail.text.match(/\[CRITIQUE\]/g) ?? []).length, ALERTS_PER_EMAIL_MAX);
  assert.match(mail.text, /\+ 4 autres alertes à retrouver dans le tableau de bord/);
});

test("sécurité du texte : un titre ne peut ni injecter du HTML, ni un en-tête (retour à la ligne dans l'objet), ni un lien déguisé", () => {
  const evil = queued("a-1", "critique", { title: `<script>alert(1)</script> "x" & <img src=x onerror=1>`, place: "<b>Lieu</b>", url: `https://example.com/"><script>1</script>` });
  const mail = immediateEmail({ supervisionName: "Veille\r\nBcc: pirate@exemple.fr", supervisionUrl: "https://x.test/", alerts: [evil] });
  assert.doesNotMatch(mail.html, /<script>/);
  assert.doesNotMatch(mail.html, /<img src=x/);
  assert.doesNotMatch(mail.html, /<b>Lieu<\/b>/);
  assert.match(mail.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &quot;x&quot; &amp;/);
  assert.doesNotMatch(mail.subject, /[\r\n]/);
  assert.equal(oneLine("a\r\nb c\td"), "a b c d");
  assert.equal(oneLine("x".repeat(500), 20).length, 20);
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  assert.doesNotMatch(mail.html, /<img |https?:\/\/[^"' ]*\.(png|gif|jpg)/i, "aucune image distante ni pixel de suivi");
});

test("digest : période dite en clair, total et plafond, objet chiffré", () => {
  const mail = digestEmail({ supervisionName: "Test Nigeria", supervisionUrl: "https://x.test/", label: "quotidien", days: 1, generatedAt: NOW, alerts: [queued("a-1"), queued("a-2", "importante")], totalAlerts: 20 });
  assert.equal(mail.subject, "[Équinoxe] Digest quotidien — 20 alertes — Test Nigeria");
  assert.match(mail.text, /Digest quotidien du 10 novembre 2026 : 20 alertes sur les dernières 24 heures, dont 1 critique\./);
  assert.match(mail.text, /\+ 18 autres alertes/);
  const week = digestEmail({ supervisionName: "V", supervisionUrl: "https://x.test/", label: "hebdomadaire", days: 7, generatedAt: NOW, alerts: [queued("a-1")], totalAlerts: 1 });
  assert.match(week.text, /sur les 7 derniers jours/);
});

test("confirmation : le lien est dans le texte et le HTML, la durée de validité est dite, rien n'est envoyé sans clic", () => {
  const mail = confirmationEmail({ supervisionName: "Test Nigeria", confirmUrl: "https://equinoxe.news/api/supervision-notify/confirm?token=abc.def", manageUrl: "https://x.test/", hours: 48 });
  assert.match(mail.text, /Confirmer mon adresse : https:\/\/equinoxe\.news\/api\/supervision-notify\/confirm\?token=abc\.def/);
  assert.match(mail.text, /valable 48 heures/);
  assert.match(mail.text, /aucune notification ne sera envoyée/);
  assert.match(mail.html, /href="https:\/\/equinoxe\.news\/api\/supervision-notify\/confirm\?token=abc\.def"/);
});

test("e-mail de test : l'exemple est clairement fictif", () => {
  const mail = testEmail({ supervisionName: "Test Nigeria", supervisionUrl: "https://x.test/", generatedAt: NOW });
  assert.match(mail.text, /Exemple fictif/);
  assert.match(mail.text, /aucun événement réel/);
  assert.match(mail.subject, /Test des notifications/);
});

// --- Lien de confirmation -----------------------------------------------------------------------------------------------------

test("jeton de confirmation : valide, falsifié, expiré, mauvais secret, mal formé", () => {
  const token = signConfirmToken("00000000-0000-0000-0000-000000000001", "moi@exemple.fr", "secret-de-test", NOW);
  assert.deepEqual(verifyConfirmToken(token, "secret-de-test", new Date(NOW.getTime() + 3_600_000)), { ok: true, supervisionId: "00000000-0000-0000-0000-000000000001", email: "moi@exemple.fr" });
  assert.deepEqual(verifyConfirmToken(token, "secret-de-test", new Date(NOW.getTime() + 49 * 3_600_000)), { ok: false, reason: "expired" });
  assert.deepEqual(verifyConfirmToken(token, "autre-secret", NOW), { ok: false, reason: "bad_signature" });
  const [body, signature] = token.split(".");
  const forgedBody = Buffer.from(JSON.stringify({ s: "00000000-0000-0000-0000-000000000001", e: "pirate@exemple.fr", x: NOW.getTime() + 1e9 })).toString("base64url");
  assert.deepEqual(verifyConfirmToken(`${forgedBody}.${signature}`, "secret-de-test", NOW), { ok: false, reason: "bad_signature" }, "changer l'adresse invalide la signature");
  for (const bad of ["", "abc", `${body}`, `${body}.${signature}.x`, "x".repeat(700)]) assert.equal(verifyConfirmToken(bad, "secret-de-test", NOW).ok, false);
  assert.equal(verifyConfirmToken(token, "", NOW).ok, false, "sans secret, rien n'est valide");
  assert.throws(() => signConfirmToken("x", "a@b.fr", ""), /Secret/);
});

// --- Fournisseur ------------------------------------------------------------------------------------------------------------

const PROD_URL = "https://abcdefghijklmnop.supabase.co";
const STAGING_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
const noFetch: FetchLike = async () => {
  throw new Error("aucun appel réseau attendu");
};

test("choix du fournisseur : sans envoi par défaut ; réel seulement avec EMAIL_MODE=live ET une clé ; la préproduction exige une liste de destinataires de test", () => {
  assert.equal(chooseProvider({}, PROD_URL, noFetch).mode, "dry_run");
  assert.equal(chooseProvider({ RESEND_API_KEY: "re_x" }, PROD_URL, noFetch).mode, "dry_run", "une clé seule ne suffit pas");
  assert.equal(chooseProvider({ EMAIL_MODE: "live" }, PROD_URL, noFetch).mode, "dry_run", "live sans clé : retour au mode sans envoi");
  assert.equal(chooseProvider({ EMAIL_MODE: "LIVE", RESEND_API_KEY: "re_x" }, PROD_URL, noFetch).mode, "dry_run", "la valeur exacte « live » est exigée");
  const prod = chooseProvider({ EMAIL_MODE: "live", RESEND_API_KEY: "re_x" }, PROD_URL, noFetch);
  assert.deepEqual([prod.mode, prod.provider.name, prod.reason], ["live", "resend", null]);
  const staging = chooseProvider({ EMAIL_MODE: "live", RESEND_API_KEY: "re_x" }, STAGING_URL, noFetch);
  assert.deepEqual([staging.mode, staging.provider.name], ["dry_run", "dry_run"]);
  assert.match(staging.reason ?? "", /Préproduction/);
  const allowed = chooseProvider({ EMAIL_MODE: "live", RESEND_API_KEY: "re_x", EMAIL_TEST_RECIPIENTS: " Moi@Exemple.fr , " }, STAGING_URL, noFetch);
  assert.equal(allowed.mode, "live");
  assert.ok(isStagingDatabase(STAGING_URL) && !isStagingDatabase(PROD_URL) && !isStagingDatabase("pas une url"));
  assert.deepEqual([...testRecipients(" A@x.fr, ,b@y.fr ")], ["a@x.fr", "b@y.fr"]);
});

test("préproduction en mode live : un destinataire autorisé reçoit un vrai message, tout autre reste en « sans envoi » sans appel réseau", async () => {
  const calls: string[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    calls.push(JSON.parse(init.body).to[0]);
    return { ok: true, status: 200, json: async () => ({ id: "re_123" }) };
  };
  const choice = chooseProvider({ EMAIL_MODE: "live", RESEND_API_KEY: "re_x", EMAIL_TEST_RECIPIENTS: "moi@exemple.fr" }, STAGING_URL, fetchImpl);
  const mail = { subject: "s", text: "t", html: "h", idempotencyKey: "k1" };
  assert.deepEqual(await choice.provider.send({ ...mail, to: "moi@exemple.fr" }), { ok: true, id: "re_123", dryRun: false });
  const other = await choice.provider.send({ ...mail, to: "inconnu@exemple.fr" });
  assert.ok(other.ok && other.dryRun);
  assert.deepEqual(calls, ["moi@exemple.fr"], "seul le destinataire de test a déclenché un appel réseau");
});

test("Resend : requête bien formée (clé, expéditeur, idempotence), erreurs classées, la clé n'apparaît jamais dans un message d'erreur", async () => {
  let seen: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
  const ok: FetchLike = async (url, init) => {
    seen = { url, headers: init.headers, body: JSON.parse(init.body) };
    return { ok: true, status: 200, json: async () => ({ id: "re_abc" }) };
  };
  const mail = { to: "moi@exemple.fr", subject: "Objet", text: "Texte", html: "<p>Texte</p>", idempotencyKey: "ob-42" };
  const result = await new ResendProvider("re_SECRET_KEY", DEFAULT_FROM, ok).send(mail);
  assert.deepEqual(result, { ok: true, id: "re_abc", dryRun: false });
  assert.ok(seen);
  const request = seen as unknown as { url: string; headers: Record<string, string>; body: Record<string, unknown> };
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.headers.Authorization, "Bearer re_SECRET_KEY");
  assert.equal(request.headers["Idempotency-Key"], "ob-42");
  assert.deepEqual(request.body, { from: "Équinoxe Alertes <alertes@alertes.equinoxe.news>", to: ["moi@exemple.fr"], subject: "Objet", text: "Texte", html: "<p>Texte</p>" });

  const fail = (status: number, body: unknown): FetchLike => async () => ({ ok: false, status, json: async () => body });
  const refused = await new ResendProvider("re_SECRET_KEY", DEFAULT_FROM, fail(422, { name: "validation_error", message: "Domain not verified" })).send(mail);
  assert.deepEqual(refused, { ok: false, retryable: false, error: "Resend 422 validation_error : Domain not verified" });
  assert.equal((await new ResendProvider("k", DEFAULT_FROM, fail(429, {})).send(mail)).ok, false);
  const limited = await new ResendProvider("k", DEFAULT_FROM, fail(429, {})).send(mail);
  const down = await new ResendProvider("k", DEFAULT_FROM, fail(503, {})).send(mail);
  assert.ok(!limited.ok && limited.retryable && !down.ok && down.retryable);
  const unreachable = await new ResendProvider("re_SECRET_KEY", DEFAULT_FROM, async () => { throw new Error("connect ECONNREFUSED re_SECRET_KEY"); }).send(mail);
  assert.ok(!unreachable.ok && unreachable.retryable);
  assert.doesNotMatch(JSON.stringify([refused, unreachable]), /re_SECRET_KEY/);
});

test("mode sans envoi : aucun appel réseau, un identifiant de journal, le même résultat pour un même message", async () => {
  const provider = new DryRunProvider();
  const mail = { to: "moi@exemple.fr", subject: "s", text: "t", html: "h", idempotencyKey: "ob-1" };
  assert.deepEqual(await provider.send(mail), { ok: true, id: "dry-ob-1", dryRun: true });
  const guarded = new AllowListProvider(new ResendProvider("k", DEFAULT_FROM, noFetch), new Set(["moi@exemple.fr"]));
  assert.ok((await guarded.send({ ...mail, to: "autre@exemple.fr" })).ok, "hors liste : sans envoi, sans appel");
});
