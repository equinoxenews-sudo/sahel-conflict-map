"use client";

import { useEffect, useState } from "react";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import styles from "./Supervision.module.css";

// Périmètre de CETTE Supervision, modifiable : pays, objectif, mots-clés, entités, exclusions. Sans IA. Chaque enregistrement crée
// une nouvelle version du périmètre côté serveur (l'ancienne est conservée) et s'applique à la PROCHAINE collecte.

interface ScopeView {
  countries: string[];
  objective: string;
  keywords: string[];
  entities: string[];
  exclusions: string[];
}

interface Loaded {
  scope: ScopeView;
  state: string;
  pending: boolean;
  objectives: { key: string; label: string }[];
  limits: { termMin: number; termMax: number; termsMax: number; countriesMax: number };
}

const countryName = (iso3: string) => COUNTRY_CODES.find((entry) => entry.iso3 === iso3)?.name ?? iso3;
const sameScope = (a: ScopeView, b: ScopeView) => JSON.stringify(a) === JSON.stringify(b);

function TagEditor({ label, help, values, onChange, limits, disabled, placeholder }: { label: string; help: string; values: string[]; onChange: (next: string[]) => void; limits: Loaded["limits"]; disabled: boolean; placeholder: string }) {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  function commit() {
    const parts = text.split(/[,;\n]/).map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (parts.length === 0) return;
    let next = values;
    for (const part of parts) {
      if (part.length < limits.termMin || part.length > limits.termMax) {
        setProblem(`« ${part.slice(0, 20)} » : de ${limits.termMin} à ${limits.termMax} caractères.`);
        return;
      }
      if (next.some((known) => known.toLocaleLowerCase("fr-FR") === part.toLocaleLowerCase("fr-FR"))) continue;
      if (next.length >= limits.termsMax) {
        setProblem(`${limits.termsMax} éléments au maximum.`);
        return;
      }
      next = [...next, part];
    }
    setProblem(null);
    setText("");
    onChange(next);
  }

  return (
    <div className={styles.tagField}>
      <strong>{label}</strong>
      <span className={styles.muted}>{help}</span>
      <div className={styles.chips}>
        {values.map((value) => (
          <span key={value} className={styles.chip}>
            {value}
            <button type="button" aria-label={`Retirer ${value}`} disabled={disabled} onClick={() => onChange(values.filter((other) => other !== value))}>×</button>
          </span>
        ))}
        {values.length === 0 ? <span className={styles.muted}>Aucun</span> : null}
      </div>
      <div className={styles.tagInput}>
        <input
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          aria-label={`Ajouter à : ${label}`}
        />
        <button type="button" onClick={commit} disabled={disabled || text.trim().length === 0}>Ajouter</button>
      </div>
      {problem ? <span className={styles.error} role="alert">{problem}</span> : null}
    </div>
  );
}

export default function ScopePanel({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<ScopeView | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ tone: "ok" | "error"; lines: string[] } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/supervision/${id}/scope`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as Loaded;
        if (cancelled) return;
        setLoaded(body);
        setDraft(body.scope);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  if (failed) return <p className={styles.muted}>Le périmètre est momentanément indisponible.</p>;
  if (!loaded || !draft) return null;

  const dirty = !sameScope(loaded.scope, draft);
  const locked = loaded.pending || loaded.state === "read_only_grace" || loaded.state === "pending_deletion";
  const objectiveLabel = loaded.objectives.find((entry) => entry.key === loaded.scope.objective)?.label ?? loaded.scope.objective;
  const summary = [
    loaded.scope.countries.map(countryName).join(", "),
    objectiveLabel,
    `${loaded.scope.keywords.length} mot${loaded.scope.keywords.length > 1 ? "s" : ""}-clé${loaded.scope.keywords.length > 1 ? "s" : ""}`,
    `${loaded.scope.entities.length} entité${loaded.scope.entities.length > 1 ? "s" : ""}`,
    `${loaded.scope.exclusions.length} exclusion${loaded.scope.exclusions.length > 1 ? "s" : ""}`,
  ].join(" · ");

  async function save() {
    if (!draft) return;
    setBusy(true);
    setMessages(null);
    try {
      const response = await fetch(`/api/supervision/${id}/scope`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ edit: draft, key: crypto.randomUUID() }) });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        setMessages({
          tone: "ok",
          lines: body.changed === false
            ? ["Aucun changement."]
            : ["Périmètre enregistré (une nouvelle version, l'ancienne est conservée).", "Il s'appliquera à la prochaine collecte : clique sur « Actualiser la collecte ». Les publications déjà rattachées ne sont pas ré-évaluées."],
        });
        setAttempt((n) => n + 1);
        if (body.changed !== false) onSaved();
      } else if (body.code === "invalid_input") {
        setMessages({ tone: "error", lines: (body.errors as string[] | undefined) ?? ["Périmètre refusé."] });
      } else if (body.code === "major_change_needs_confirmation") {
        setMessages({ tone: "error", lines: ["Cette Supervision est active et le changement est jugé majeur (il consommerait un crédit). La confirmation n'est pas encore disponible : rien n'a été modifié."] });
      } else if (body.code === "change_pending") {
        setMessages({ tone: "error", lines: ["Un changement de périmètre est déjà en attente de confirmation."] });
      } else if (body.code === "read_only") {
        setMessages({ tone: "error", lines: ["Cette Supervision est en lecture seule."] });
      } else {
        setMessages({ tone: "error", lines: ["Enregistrement impossible. Réessaie dans un instant."] });
      }
    } catch {
      setMessages({ tone: "error", lines: ["Enregistrement impossible : réseau indisponible."] });
    } finally {
      setBusy(false);
    }
  }

  const addable = COUNTRY_CODES.filter((entry) => !draft.countries.includes(entry.iso3));
  return (
    <div className={styles.history} style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center" }}>
        <strong>Périmètre</strong>
        <span className={styles.muted}>{summary}</span>
        <button type="button" onClick={() => setOpen((value) => !value)} style={{ background: "none", border: 0, color: "var(--accent-gold-bright, #e0b44c)", cursor: "pointer", padding: 0, fontSize: 13 }}>
          {open ? "Fermer" : "Modifier le périmètre"}
        </button>
      </div>
      {open ? (
        <div className={styles.scopeForm}>
          {locked ? <p className={styles.muted} role="status">{loaded.pending ? "Un changement est en attente de confirmation : le périmètre ne peut pas être modifié pour l'instant." : "Cette Supervision est en lecture seule."}</p> : null}

          <div className={styles.tagField}>
            <strong>Pays</strong>
            <span className={styles.muted}>La collecte et le tableau ne retiennent que les publications qui citent l&apos;un de ces pays ({loaded.limits.countriesMax} au maximum).</span>
            <div className={styles.chips}>
              {draft.countries.map((iso3) => (
                <span key={iso3} className={styles.chip}>
                  {countryName(iso3)}
                  <button type="button" aria-label={`Retirer ${countryName(iso3)}`} disabled={locked || draft.countries.length <= 1} onClick={() => setDraft({ ...draft, countries: draft.countries.filter((other) => other !== iso3) })}>×</button>
                </span>
              ))}
            </div>
            <div className={styles.tagInput}>
              <select
                value=""
                disabled={locked || draft.countries.length >= loaded.limits.countriesMax}
                onChange={(event) => event.target.value && setDraft({ ...draft, countries: [...draft.countries, event.target.value] })}
                aria-label="Ajouter un pays"
              >
                <option value="">Ajouter un pays…</option>
                {addable.map((entry) => (
                  <option key={entry.iso3} value={entry.iso3}>{entry.name}</option>
                ))}
              </select>
            </div>
          </div>

          <label className={styles.field}>
            <span>Objectif de la veille</span>
            <select value={draft.objective} disabled={locked} onChange={(event) => setDraft({ ...draft, objective: event.target.value })}>
              {loaded.objectives.map((entry) => (
                <option key={entry.key} value={entry.key}>{entry.label}</option>
              ))}
            </select>
          </label>

          <TagEditor
            label="Mots-clés"
            help="Dès qu'il y en a, SEULS les mots-clés et les entités comptent : une publication doit citer le pays et au moins l'un d'eux. Le vocabulaire général de l'objectif ne suffit plus."
            values={draft.keywords}
            onChange={(keywords) => setDraft({ ...draft, keywords })}
            limits={loaded.limits}
            disabled={locked}
            placeholder="Ex. enlèvement, pipeline (Entrée pour ajouter)"
          />
          <TagEditor
            label="Entités (lieux, groupes, personnes)"
            help="Même effet que les mots-clés, avec plus de poids dans le score."
            values={draft.entities}
            onChange={(entities) => setDraft({ ...draft, entities })}
            limits={loaded.limits}
            disabled={locked}
            placeholder="Ex. Boko Haram, Maiduguri"
          />
          <TagEditor
            label="Exclusions"
            help="Une publication qui contient l'un de ces mots est écartée, quoi qu'elle cite d'autre."
            values={draft.exclusions}
            onChange={(exclusions) => setDraft({ ...draft, exclusions })}
            limits={loaded.limits}
            disabled={locked}
            placeholder="Ex. football, mercato"
          />

          {draft.keywords.length === 0 && draft.entities.length === 0 ? (
            <p className={styles.muted}>Sans mot-clé ni entité, c&apos;est le vocabulaire général de l&apos;objectif qui s&apos;applique (pour la sécurité : la publication doit rapporter un fait, attaque, enlèvement, bilan…).</p>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button type="button" className={styles.primary} disabled={busy || locked || !dirty} onClick={() => void save()}>
              {busy ? "Enregistrement…" : "Enregistrer le périmètre"}
            </button>
            <button type="button" disabled={busy || !dirty} onClick={() => setDraft(loaded.scope)} style={{ cursor: "pointer" }}>Annuler les modifications</button>
          </div>
          {messages ? (
            <div role={messages.tone === "error" ? "alert" : "status"} className={messages.tone === "error" ? styles.error : styles.muted}>
              {messages.lines.map((line) => (
                <p key={line} style={{ margin: "4px 0 0" }}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
