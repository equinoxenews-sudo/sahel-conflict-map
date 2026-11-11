"use client";

import { useEffect, useState } from "react";
import { FILTER_TERMS_MAX, FILTER_THEMES, describeFilters, type AlertFilters, type FilterTheme } from "@/lib/supervision/notify/filters";
import { notifyMessage, type DigestMode } from "@/lib/supervision/notify/rules";
import styles from "./Supervision.module.css";

// Notifications par e-mail d'UNE Supervision : niveaux d'e-mail immédiat, digest, adresse (à confirmer par un lien) et journal d'envoi.
// Sans IA, aucun coût d'IA. Rien ne part d'une Supervision qui n'est pas active ni vers une adresse non confirmée ; par défaut le serveur
// est en mode « sans envoi » (les messages sont écrits dans le journal mais ne partent pas).

interface Rules {
  enabled: boolean;
  immediateLevels: ("critique" | "importante")[];
  digest: DigestMode;
  recipient: string | null;
  recipientVerified: boolean;
  filters: AlertFilters;
}

interface JournalEntry {
  id: string;
  kind: "immediate" | "digest" | "test" | "confirm";
  status: "pending" | "sending" | "sent" | "failed" | "dry_run" | "skipped";
  subject: string | null;
  createdAt: string;
  error: string | null;
}

const KIND_LABEL: Record<JournalEntry["kind"], string> = { immediate: "Alertes", digest: "Digest", test: "Test", confirm: "Confirmation" };
const STATUS_LABEL: Record<JournalEntry["status"], string> = { pending: "En attente", sending: "En cours", sent: "Envoyé", failed: "Échec", dry_run: "Sans envoi (journal seulement)", skipped: "Annulé" };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const THEME_LABEL: Record<FilterTheme, string> = { conflits: "Conflits", securite: "Sécurité", politique: "Politique", humanitaire: "Humanitaire" };

/** Termes saisis séparés par des virgules ou des retours à la ligne. */
const splitTerms = (text: string) => text.split(/[,\n;]+/).map((term) => term.trim()).filter((term) => term.length > 0);

export default function NotificationsPanel({ id, state }: { id: string; state: string }) {
  const [rules, setRules] = useState<Rules | null>(null);
  const [form, setForm] = useState<Rules | null>(null);
  // Texte brut des deux listes de termes : la saisie compte tout de suite (pas seulement en quittant le champ).
  const [terms, setTerms] = useState<{ keywords: string; exclusions: string } | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [mode, setMode] = useState<{ mode: "live" | "dry_run"; reason: string | null } | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/supervision/${id}/notifications`, { cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(response.status === 503 ? "Les notifications ne sont pas encore disponibles dans cette base." : notifyMessage(body.code));
          return;
        }
        const next = body.rules as Rules;
        setRules(next);
        setForm((current) => current ?? next);
        setTerms((current) => current ?? { keywords: next.filters.keywords.join(", "), exclusions: next.filters.exclusions.join(", ") });
        setJournal(body.journal as JournalEntry[]);
        setMode({ mode: body.mode, reason: body.reason });
        setReadOnly(body.readOnly === true);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Notifications indisponibles : réseau interrompu.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  if (loadError) return <p className={styles.muted} role="alert" style={{ marginBottom: 8 }}>{loadError}</p>;
  if (!rules || !form || !terms) return null;
  // Valeurs effectives du formulaire : les listes sont lues dans le texte saisi.
  const effective: Rules = { ...form, filters: { ...form.filters, keywords: splitTerms(terms.keywords), exclusions: splitTerms(terms.exclusions) } };

  const dirty = JSON.stringify({ ...effective, recipientVerified: 0 }) !== JSON.stringify({ ...rules, recipientVerified: 0 });
  const toggleTheme = (theme: FilterTheme) => setForm({ ...form, filters: { ...form.filters, themes: form.filters.themes.includes(theme) ? form.filters.themes.filter((entry) => entry !== theme) : [...form.filters.themes, theme] } });
  const toggleLevel = (level: "critique" | "importante") => setForm({ ...form, immediateLevels: form.immediateLevels.includes(level) ? form.immediateLevels.filter((entry) => entry !== level) : [...form.immediateLevels, level] });

  async function call(url: string, init: RequestInit, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(url, init);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ tone: "error", text: Array.isArray(body.errors) ? body.errors.join(" ") : (body.message as string | undefined) ?? notifyMessage(body.code, body) });
        return;
      }
      setMessage({ tone: "ok", text: done });
      if (url.endsWith("/notifications") && init.method === "PUT") {
        setForm(null);
        setTerms(null);
      }
      setVersion((v) => v + 1);
    } catch {
      setMessage({ tone: "error", text: "Opération impossible : réseau interrompu." });
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    call(`/api/supervision/${id}/notifications`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: form.enabled, immediateLevels: form.immediateLevels, digest: form.digest, recipient: form.recipient ?? "", filters: effective.filters }) }, "Préférences enregistrées.");
  const post = (action: "confirm" | "test", done: string) => call(`/api/supervision/${id}/notifications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }, done);

  const locked = readOnly || busy;
  const notActive = state !== "active";

  return (
    <div className={styles.history} style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center" }}>
        <strong>Notifications</strong>
        <span className={styles.muted}>E-mails d&apos;alerte et digest. Sans IA, aucun coût. Une alerte n&apos;est pas une preuve.</span>
      </div>
      {mode?.mode === "dry_run" ? <p className={styles.muted} role="status" style={{ marginTop: 6 }}>{mode.reason}</p> : mode?.reason ? <p className={styles.muted} style={{ marginTop: 6 }}>{mode.reason}</p> : null}
      {notActive ? <p className={styles.muted} role="status" style={{ marginTop: 6 }}>Rien n&apos;est envoyé tant que la Supervision n&apos;est pas active (état actuel : {state === "draft" ? "brouillon" : state === "paused" ? "en pause" : state}).</p> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={form.enabled} disabled={locked} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
          Activer les notifications par e-mail
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}>
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            Adresse
            <input type="email" value={form.recipient ?? ""} disabled={locked} maxLength={254} placeholder="prenom@exemple.fr" autoComplete="email" aria-label="Adresse e-mail des notifications" onChange={(event) => setForm({ ...form, recipient: event.target.value })} style={{ minWidth: 220 }} />
          </label>
          {rules.recipient && form.recipient === rules.recipient ? (
            rules.recipientVerified ? (
              <span className={styles.muted}>Adresse confirmée</span>
            ) : (
              <>
                <span className={styles.muted}>À confirmer</span>
                <button type="button" disabled={locked || dirty} onClick={() => void post("confirm", "Lien de confirmation envoyé.")}>Envoyer le lien de confirmation</button>
              </>
            )
          ) : null}
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center" }} disabled={locked}>
          <legend className={styles.muted} style={{ padding: 0, marginBottom: 4 }}>E-mail immédiat (regroupé, après quelques minutes)</legend>
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={form.immediateLevels.includes("critique")} onChange={() => toggleLevel("critique")} />
            Alertes critiques
          </label>
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={form.immediateLevels.includes("importante")} onChange={() => toggleLevel("importante")} />
            Alertes importantes
          </label>
        </fieldset>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          Digest
          <select value={form.digest} disabled={locked} aria-label="Fréquence du digest" onChange={(event) => setForm({ ...form, digest: event.target.value as DigestMode })}>
            <option value="off">Aucun</option>
            <option value="daily">Quotidien (vers 7 h)</option>
            <option value="weekly">Hebdomadaire (le lundi vers 7 h)</option>
          </select>
        </label>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }} disabled={locked}>
          <legend className={styles.muted} style={{ padding: 0, marginBottom: 4 }}>Règles d&apos;alerte (elles restreignent les e-mails, elles n&apos;ajoutent jamais une alerte)</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center" }}>
            <span className={styles.muted}>Thèmes (aucun coché = tous)</span>
            {FILTER_THEMES.map((theme) => (
              <label key={theme} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={form.filters.themes.includes(theme)} onChange={() => toggleTheme(theme)} />
                {THEME_LABEL[theme]}
              </label>
            ))}
          </div>
          <label style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            Citant l&apos;un de (lieux, entités, sujets)
            <input type="text" value={terms.keywords} aria-label="Mots-clés des alertes" placeholder="Zamfara, Boko Haram" maxLength={900} onChange={(event) => setTerms({ ...terms, keywords: event.target.value })} style={{ minWidth: 260 }} />
          </label>
          <label style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            Sans (exclusions)
            <input type="text" value={terms.exclusions} aria-label="Exclusions des alertes" placeholder="football, match" maxLength={900} onChange={(event) => setTerms({ ...terms, exclusions: event.target.value })} style={{ minWidth: 260 }} />
          </label>
          <span className={styles.muted}>{FILTER_TERMS_MAX} termes au plus par liste, séparés par des virgules. {describeFilters(effective.filters)}</span>
        </fieldset>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className={styles.primary} disabled={locked || !dirty} onClick={() => void save()}>Enregistrer</button>
          <button type="button" disabled={locked || !rules.recipientVerified || dirty} onClick={() => void post("test", "E-mail de test demandé.")}>Envoyer un e-mail de test</button>
        </div>
      </div>

      {message ? (
        <p className={message.tone === "error" ? styles.error : styles.muted} role={message.tone === "error" ? "alert" : "status"} style={{ marginTop: 6 }}>
          {message.text}
        </p>
      ) : null}

      <h4 style={{ margin: "12px 0 4px", fontSize: 13 }}>Journal d&apos;envoi</h4>
      {journal.length === 0 ? (
        <p className={styles.muted}>Aucun message pour l&apos;instant.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
          {journal.map((entry) => (
            <li key={entry.id}>
              <span>{KIND_LABEL[entry.kind]} · {STATUS_LABEL[entry.status]}</span>
              <span className={styles.muted}> · {dateFormat.format(new Date(entry.createdAt))}{entry.subject ? ` · ${entry.subject}` : ""}{entry.error ? ` · ${entry.error}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
