"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ALERT_LEVELS, LEVEL_LABELS, alertMessage, buildAlerts, countAlerts, effectiveStatus, type Alert, type AlertLevel, type AlertStatus, type StoredDecision } from "@/lib/supervision/alerts/rules";
import { VERIFICATION_LABELS, type BoardEvent } from "@/lib/supervision/dashboard/fixtures";
import type { Band } from "@/lib/supervision/dashboard/layout";
import { useOpenEvent } from "./EventDetail";
import styles from "./Lab.module.css";

// Alertes d'UNE Supervision réelle (module « Alertes » du tableau). Elles se déduisent des événements affichés (priorité critique ou
// importante, jamais « information ») ; seule la décision de l'utilisateur (lue, conservée, masquée) est enregistrée. Sans IA, aucun coût.
// Le contexte porte l'identité et l'état de la Supervision : sans lui, le module garde son comportement de prototype.

export interface AlertsScope {
  supervisionId: string;
  state: string;
  pausedAt: string | null;
  readOnly: boolean;
}

export const AlertsScopeContext = createContext<AlertsScope | null>(null);
export const useAlertsScope = () => useContext(AlertsScopeContext);

const LEVEL_COLOR: Record<AlertLevel, string> = { importante: "#e87932", critique: "#d94a4a" };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Filter = AlertStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "new", label: "À traiter" },
  { key: "kept", label: "Conservées" },
  { key: "read", label: "Lues" },
  { key: "hidden", label: "Masquées" },
];

const STATE_NOTICE: Record<string, string> = {
  draft: "Brouillon : aperçu des alertes. Aucune notification n'est envoyée tant que la Supervision n'est pas active.",
  paused: "En pause : plus aucune nouvelle alerte. Seuls les événements antérieurs à la pause restent affichés.",
  read_only_grace: "Lecture seule : les alertes restent consultables, plus modifiables.",
  pending_deletion: "Suppression en cours : les alertes restent consultables, plus modifiables.",
  initializing: "Initialisation en cours : les alertes apparaîtront après la première collecte.",
};

export default function AlertsPanel({ band, events }: { band: Band; events: BoardEvent[] }) {
  const scope = useAlertsScope();
  const open = useOpenEvent();
  const [decisions, setDecisions] = useState<Map<string, StoredDecision> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState<Filter>("new");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [whyOpen, setWhyOpen] = useState<string | null>(null);
  const supervisionId = scope?.supervisionId ?? null;

  useEffect(() => {
    if (!supervisionId) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/supervision/${supervisionId}/alerts`, { cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(response.status === 503 ? "Les décisions sur les alertes ne sont pas encore disponibles dans cette base." : alertMessage(body.code));
          return;
        }
        setDecisions(new Map((body.states as { eventRef: string; status: StoredDecision["status"]; level: AlertLevel }[]).map((row) => [row.eventRef, { status: row.status, level: row.level }])));
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Alertes indisponibles : réseau interrompu.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supervisionId, version]);

  const alerts = useMemo(() => (scope ? buildAlerts(events, { state: scope.state, pausedAt: scope.pausedAt }) : []), [events, scope]);
  const known = useMemo(() => decisions ?? new Map<string, StoredDecision>(), [decisions]);
  const counts = useMemo(() => countAlerts(alerts, known), [alerts, known]);
  if (!scope || !supervisionId) return null;

  const statusOf = (alert: Alert) => effectiveStatus(alert, known.get(alert.id));
  const visible = alerts.filter((alert) => statusOf(alert) === filter);
  const limit = band === "compact" ? 0 : band === "standard" ? 5 : 12;
  const editable = !scope.readOnly && decisions !== null;

  async function decide(status: "read" | "kept" | "hidden" | "new", targets: Alert[], done: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/supervision/${supervisionId}/alerts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, items: targets.slice(0, 100).map((alert) => ({ eventRef: alert.id, level: alert.level })) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(Array.isArray(body.errors) ? body.errors.join(" ") : alertMessage(body.code, body));
        return;
      }
      setMessage(done);
      setVersion((v) => v + 1);
    } catch {
      setMessage("Opération impossible : réseau interrompu.");
    } finally {
      setBusy(false);
    }
  }

  const notice = STATE_NOTICE[scope.state];
  const header = (
    <div className={styles.kpis}>
      <div><b>{counts.new}</b><span>à traiter</span></div>
      <div><b style={{ color: LEVEL_COLOR.critique }}>{counts.newCritical}</b><span>critique{counts.newCritical > 1 ? "s" : ""}</span></div>
      <div><b style={{ color: LEVEL_COLOR.importante }}>{counts.newImportant}</b><span>importante{counts.newImportant > 1 ? "s" : ""}</span></div>
    </div>
  );

  if (band === "compact") return <div className={styles.stack}>{header}</div>;

  return (
    <div className={styles.stack}>
      {header}
      {notice ? <p className={styles.muted} role="status">{notice}</p> : null}
      {loadError ? <p className={styles.muted} role="alert">{loadError}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="group" aria-label="Filtrer les alertes">
        {FILTERS.map(({ key, label }) => (
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} style={{ cursor: "pointer", fontWeight: filter === key ? 700 : 400 }}>
            {label} ({counts[key]})
          </button>
        ))}
        {editable && filter === "new" && counts.new > 1 && band === "expanded" ? (
          <button type="button" disabled={busy} onClick={() => void decide("read", visible, `${Math.min(visible.length, 100)} alertes marquées lues.`)} style={{ cursor: "pointer" }}>Tout marquer comme lu</button>
        ) : null}
      </div>
      {message ? <p className={styles.muted} role="status">{message}</p> : null}
      {alerts.length === 0 ? (
        <p className={styles.muted}>
          Aucune alerte pour l&apos;instant. Une alerte naît d&apos;un événement de priorité importante ou critique ; les publications de presse collectées restent au niveau information tant que l&apos;IA ne les trie pas.
        </p>
      ) : visible.length === 0 ? (
        <p className={styles.muted}>Aucune alerte dans « {FILTERS.find((f) => f.key === filter)?.label} ».</p>
      ) : (
        <ul className={styles.list}>
          {visible.slice(0, limit).map((alert) => {
            const status = statusOf(alert);
            const event = alert.event;
            return (
              <li key={alert.id} className={status === "read" ? styles.read : undefined}>
                <strong>
                  <button type="button" className={styles.srcLink} onClick={() => open(event)}>{event.title}</button>
                </strong>
                <span className={styles.meta}>
                  <span className={styles.chip} style={{ borderColor: LEVEL_COLOR[alert.level], color: LEVEL_COLOR[alert.level] }}>{LEVEL_LABELS[alert.level]}</span>{" "}
                  {VERIFICATION_LABELS[event.verification]}
                  {event.qualifier ? ` · ${event.qualifier}` : ""} · {event.place} · {dateFormat.format(new Date(event.at))}
                </span>
                {band === "expanded" ? (
                  <span className={styles.meta}>
                    <button type="button" className={styles.linkBtn} onClick={() => setWhyOpen(whyOpen === alert.id ? null : alert.id)}>{whyOpen === alert.id ? "masquer l'origine" : "pourquoi cette alerte ?"}</button>
                    {editable ? (
                      <>
                        {status !== "read" ? <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => void decide("read", [alert], "Alerte marquée lue.")}>marquer lue</button> : null}
                        {status !== "kept" ? <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => void decide("kept", [alert], "Alerte conservée.")}>conserver</button> : null}
                        {status !== "hidden" ? <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => void decide("hidden", [alert], "Alerte masquée (elle reste dans « Masquées »).")}>masquer</button> : null}
                        {status !== "new" ? <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => void decide("new", [alert], "Alerte rétablie à traiter.")}>rétablir</button> : null}
                      </>
                    ) : null}
                  </span>
                ) : null}
                {band === "expanded" && whyOpen === alert.id ? <span className={styles.muted}>{alert.why} Priorité et vérification sont indépendantes : cette alerte n&apos;est pas une preuve.</span> : null}
              </li>
            );
          })}
        </ul>
      )}
      {visible.length > limit && limit > 0 ? <p className={styles.muted}>{visible.length - limit} autre{visible.length - limit > 1 ? "s" : ""} : agrandis le module pour tout voir.</p> : null}
      <p className={styles.muted} style={{ fontSize: 12 }}>
        Niveaux : {ALERT_LEVELS.map((level) => LEVEL_LABELS[level].toLowerCase()).join(" et ")} seulement ; « information » ne déclenche jamais d&apos;alerte. Les e-mails ne sont pas encore actifs.
      </p>
    </div>
  );
}
