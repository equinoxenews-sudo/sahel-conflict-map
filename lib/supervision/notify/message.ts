// Supervision V1, Lot 9 : texte des e-mails de notification. Module PUR et testé : aucune base, aucun réseau, aucune IA.
//
// Règles de rédaction (cahier des charges, sections 4 et 6.2) :
//  - une alerte n'est PAS une preuve : chaque message le rappelle, et ne présente jamais un nombre de reprises comme un indice de véracité ;
//  - la priorité et la vérification sont dites séparément ;
//  - texte brut ET HTML simple (aucune image distante, aucun pixel de suivi, aucun lien déguisé : l'adresse visible est celle du lien) ;
//  - tout texte venu de la collecte (titres) est échappé : un titre ne peut pas injecter de HTML.

import { LEVEL_LABELS, type AlertLevel } from "../alerts/rules";
import { ALERTS_PER_EMAIL_MAX, type QueuedAlert } from "./rules";

export interface EmailMessage {
  subject: string;
  text: string;
  html: string;
}

const PARIS = "Europe/Paris";
const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: PARIS });
const longFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: PARIS });

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Texte d'une seule ligne, sans caractère de contrôle ni retour à la ligne : sûr dans un objet d'e-mail (pas d'injection d'en-tête). */
export function oneLine(value: string, max = 160): string {
  const clean = value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const VERIFICATION: Record<string, string> = { signalement: "Signalement", corrobore: "Corroboré", conteste: "Contesté", confirme: "Confirmé" };

function verificationText(alert: QueuedAlert): string {
  return `${VERIFICATION[alert.verification] ?? "Signalement"}${alert.qualifier ? ` · ${alert.qualifier}` : ""}`;
}

const REMINDER = "Une alerte n'est pas une preuve : la priorité mesure l'importance supposée d'un événement, la vérification dit ce qu'on en sait réellement, et le nombre de reprises par les médias ne mesure pas la véracité.";

function footer(name: string, manageUrl: string): { text: string; html: string } {
  const why = `Tu reçois ce message parce que les notifications de la Supervision « ${oneLine(name, 80)} » sont activées pour cette adresse.`;
  return {
    text: `\n--\n${REMINDER}\n${why}\nGérer les notifications : ${manageUrl}\n`,
    html: `<hr style="border:0;border-top:1px solid #dde3e8;margin:20px 0"><p style="color:#5d6b78;font-size:12px;line-height:1.5;margin:0 0 6px">${escapeHtml(REMINDER)}</p><p style="color:#5d6b78;font-size:12px;line-height:1.5;margin:0">${escapeHtml(why)} <a href="${escapeHtml(manageUrl)}" style="color:#0f5f7a">Gérer les notifications</a> (${escapeHtml(manageUrl)})</p>`,
  };
}

function wrapHtml(inner: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;padding:16px;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#14202b"><div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #dde3e8;border-radius:8px;padding:20px">${inner}</div></body></html>`;
}

const LEVEL_COLOR: Record<AlertLevel, string> = { critique: "#c42e2e", importante: "#d1690f" };

function alertBlockText(alert: QueuedAlert): string {
  const host = hostOf(alert.url);
  return [
    `[${LEVEL_LABELS[alert.level].toUpperCase()}] ${oneLine(alert.title, 300)}`,
    `  ${dayFormat.format(new Date(alert.at))} · ${oneLine(alert.place, 80)} · Vérification : ${oneLine(verificationText(alert), 120)}`,
    `  Origine du classement : ${oneLine(alert.why, 240)}`,
    ...(alert.url ? [`  Source : ${host ?? "lien"} — ${alert.url}`] : []),
  ].join("\n");
}

function alertBlockHtml(alert: QueuedAlert): string {
  const host = hostOf(alert.url);
  return `<div style="border-top:1px solid #dde3e8;padding:10px 0"><span style="display:inline-block;background:${LEVEL_COLOR[alert.level]};color:#fff;font-size:11px;font-weight:bold;padding:1px 7px;border-radius:3px">${escapeHtml(LEVEL_LABELS[alert.level].toUpperCase())}</span> <strong style="font-size:14px">${escapeHtml(oneLine(alert.title, 300))}</strong><div style="color:#5d6b78;font-size:12px;line-height:1.5;margin-top:4px">${escapeHtml(dayFormat.format(new Date(alert.at)))} · ${escapeHtml(oneLine(alert.place, 80))} · Vérification : ${escapeHtml(oneLine(verificationText(alert), 120))}<br>Origine du classement : ${escapeHtml(oneLine(alert.why, 240))}${alert.url ? `<br>Source : ${escapeHtml(host ?? "lien")} — <a href="${escapeHtml(alert.url)}" style="color:#0f5f7a">${escapeHtml(alert.url)}</a>` : ""}</div></div>`;
}

function alertsList(alerts: readonly QueuedAlert[], total: number): { text: string; html: string } {
  const shown = alerts.slice(0, ALERTS_PER_EMAIL_MAX);
  const more = total - shown.length;
  const moreText = more > 0 ? `\n+ ${more} autre${more > 1 ? "s" : ""} alerte${more > 1 ? "s" : ""} à retrouver dans le tableau de bord.\n` : "";
  return {
    text: `${shown.map(alertBlockText).join("\n\n")}\n${moreText}`,
    html: `${shown.map(alertBlockHtml).join("")}${more > 0 ? `<p style="font-size:13px;color:#5d6b78">+ ${more} autre${more > 1 ? "s" : ""} alerte${more > 1 ? "s" : ""} à retrouver dans le tableau de bord.</p>` : ""}`,
  };
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

export interface ImmediateContext {
  supervisionName: string;
  supervisionUrl: string;
  alerts: readonly QueuedAlert[];
}

/** E-mail immédiat : toutes les alertes arrivées dans la fenêtre de temporisation, dans un seul message. */
export function immediateEmail(ctx: ImmediateContext): EmailMessage {
  const total = ctx.alerts.length;
  const critical = ctx.alerts.filter((alert) => alert.level === "critique").length;
  const subject = oneLine(`[Équinoxe] ${total} ${plural(total, "nouvelle alerte", "nouvelles alertes")}${critical > 0 ? ` dont ${critical} critique${critical > 1 ? "s" : ""}` : ""} — ${ctx.supervisionName}`, 200);
  const list = alertsList(ctx.alerts, total);
  const foot = footer(ctx.supervisionName, ctx.supervisionUrl);
  const intro = `${total} ${plural(total, "nouvelle alerte", "nouvelles alertes")} sur la Supervision « ${oneLine(ctx.supervisionName, 80)} ».`;
  return {
    subject,
    text: `${intro}\n\n${list.text}\nOuvrir le tableau de bord : ${ctx.supervisionUrl}\n${foot.text}`,
    html: wrapHtml(`<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(intro)}</h1>${list.html}<p style="margin:16px 0 0"><a href="${escapeHtml(ctx.supervisionUrl)}" style="color:#0f5f7a;font-weight:bold">Ouvrir le tableau de bord</a></p>${foot.html}`),
  };
}

export interface DigestContext {
  supervisionName: string;
  supervisionUrl: string;
  label: string;
  days: number;
  generatedAt: Date;
  alerts: readonly QueuedAlert[];
  totalAlerts: number;
}

/** Digest périodique : les alertes de la période, les plus graves d'abord. */
export function digestEmail(ctx: DigestContext): EmailMessage {
  const critical = ctx.alerts.filter((alert) => alert.level === "critique").length;
  const subject = oneLine(`[Équinoxe] Digest ${ctx.label} — ${ctx.totalAlerts} ${plural(ctx.totalAlerts, "alerte", "alertes")} — ${ctx.supervisionName}`, 200);
  const list = alertsList(ctx.alerts, ctx.totalAlerts);
  const foot = footer(ctx.supervisionName, ctx.supervisionUrl);
  const period = ctx.days === 1 ? "les dernières 24 heures" : `les ${ctx.days} derniers jours`;
  const intro = `Digest ${ctx.label} du ${longFormat.format(ctx.generatedAt)} : ${ctx.totalAlerts} ${plural(ctx.totalAlerts, "alerte", "alertes")} sur ${period}${critical > 0 ? `, dont ${critical} critique${critical > 1 ? "s" : ""}` : ""}.`;
  return {
    subject,
    text: `${intro}\nSupervision : « ${oneLine(ctx.supervisionName, 80)} »\n\n${list.text}\nOuvrir le tableau de bord : ${ctx.supervisionUrl}\n${foot.text}`,
    html: wrapHtml(`<h1 style="font-size:18px;margin:0 0 4px">${escapeHtml(intro)}</h1><p style="color:#5d6b78;font-size:13px;margin:0 0 12px">Supervision « ${escapeHtml(oneLine(ctx.supervisionName, 80))} »</p>${list.html}<p style="margin:16px 0 0"><a href="${escapeHtml(ctx.supervisionUrl)}" style="color:#0f5f7a;font-weight:bold">Ouvrir le tableau de bord</a></p>${foot.html}`),
  };
}

export interface ConfirmContext {
  supervisionName: string;
  confirmUrl: string;
  manageUrl: string;
  hours: number;
}

/** Confirmation de l'adresse : sans ce clic, aucune notification n'est envoyée à cette adresse. */
export function confirmationEmail(ctx: ConfirmContext): EmailMessage {
  const subject = oneLine(`[Équinoxe] Confirme ton adresse — ${ctx.supervisionName}`, 200);
  const intro = `Confirme que tu veux recevoir les notifications de la Supervision « ${oneLine(ctx.supervisionName, 80)} » à cette adresse.`;
  const validity = `Ce lien est valable ${ctx.hours} heures. Si tu n'as rien demandé, ignore ce message : aucune notification ne sera envoyée.`;
  return {
    subject,
    text: `${intro}\n\nConfirmer mon adresse : ${ctx.confirmUrl}\n\n${validity}\n`,
    html: wrapHtml(`<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(intro)}</h1><p style="margin:0 0 12px"><a href="${escapeHtml(ctx.confirmUrl)}" style="display:inline-block;background:#0f5f7a;color:#fff;padding:9px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Confirmer mon adresse</a></p><p style="color:#5d6b78;font-size:12px;line-height:1.5;margin:0 0 6px">Si le bouton ne marche pas, copie ce lien : ${escapeHtml(ctx.confirmUrl)}</p><p style="color:#5d6b78;font-size:12px;line-height:1.5;margin:0">${escapeHtml(validity)}</p>`),
  };
}

export interface TestContext {
  supervisionName: string;
  supervisionUrl: string;
  generatedAt: Date;
}

/** E-mail de test : montre à quoi ressemblera une alerte, avec un exemple clairement fictif. */
export function testEmail(ctx: TestContext): EmailMessage {
  const sample: QueuedAlert = {
    eventRef: "a-0",
    level: "importante",
    title: "Exemple fictif : ceci est un message de test, il ne correspond à aucun événement réel",
    at: ctx.generatedAt.toISOString(),
    place: "Lieu d'exemple",
    verification: "signalement",
    qualifier: "jugé possible par l'analyse",
    url: null,
    why: "Message de test : aucune règle réelle n'a été appliquée.",
  };
  const list = alertsList([sample], 1);
  const foot = footer(ctx.supervisionName, ctx.supervisionUrl);
  const intro = `Test des notifications de la Supervision « ${oneLine(ctx.supervisionName, 80)} ».`;
  return {
    subject: oneLine(`[Équinoxe] Test des notifications — ${ctx.supervisionName}`, 200),
    text: `${intro}\nSi tu lis ce message, l'envoi fonctionne. Voici à quoi ressemblera une alerte :\n\n${list.text}${foot.text}`,
    html: wrapHtml(`<h1 style="font-size:18px;margin:0 0 6px">${escapeHtml(intro)}</h1><p style="font-size:13px;color:#5d6b78;margin:0 0 12px">Si tu lis ce message, l'envoi fonctionne. Voici à quoi ressemblera une alerte :</p>${list.html}${foot.html}`),
  };
}
