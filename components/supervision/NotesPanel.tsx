"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NOTE_MAX, noteMessage, type Note } from "@/lib/supervision/core/notes";
import styles from "./Lab.module.css";

// Notes enregistrées d'UNE Supervision (module « Notes et analyses » et panneau « Sources et preuves »). Sans IA, aucun coût.
//  - Chaque ajout porte une clé propre à la saisie : un double clic ne crée qu'une note.
//  - Une modification envoie la révision lue : si la note a changé ailleurs, rien n'est écrasé.
//  - Une suppression demande confirmation et MASQUE la note (elle n'est jamais effacée).
// Le contexte porte l'identité de la Supervision et un compteur de version : une note ajoutée dans le panneau d'une publication
// met à jour le module Notes sans recharger la page.

export interface NotesScope {
  supervisionId: string;
  readOnly: boolean;
  version: number;
  bump: () => void;
}

export const NotesScopeContext = createContext<NotesScope | null>(null);
export const useNotesScope = () => useContext(NotesScopeContext);

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const newKey = () => `note-${crypto.randomUUID()}`;

export function useNotesScopeValue(supervisionId: string, readOnly: boolean): NotesScope {
  const [version, setVersion] = useState(0);
  return useMemo(() => ({ supervisionId, readOnly, version, bump: () => setVersion((v) => v + 1) }), [supervisionId, readOnly, version]);
}

type Message = { tone: "ok" | "error"; text: string } | null;

export default function NotesPanel({ eventRef, eventTitle, compact = false, alsoRefs }: { eventRef?: string; eventTitle?: string; compact?: boolean; alsoRefs?: string[] }) {
  const scope = useNotesScope();
  const supervisionId = scope?.supervisionId ?? null;
  const version = scope?.version ?? 0;
  const bump = scope?.bump;
  const readOnly = scope?.readOnly ?? false;

  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const keyRef = useRef(newKey());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [editing, setEditing] = useState<{ id: string; text: string; revision: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Une histoire regroupée relit aussi les notes posées sur ses reprises (avant ou après le regroupement) : rien ne disparaît.
  const refsKey = [eventRef, ...(alsoRefs ?? [])].filter(Boolean).slice(0, 20).map((ref) => `event=${encodeURIComponent(ref!)}`).join("&");
  const listUrl = supervisionId ? `/api/supervision/${supervisionId}/notes${refsKey ? `?${refsKey}` : ""}` : null;

  useEffect(() => {
    if (!listUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(listUrl, { cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(response.status === 503 ? "Les notes ne sont pas encore disponibles dans cette base." : noteMessage(body.code));
          return;
        }
        setNotes(body.notes as Note[]);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Notes indisponibles : réseau interrompu.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listUrl, version]);

  if (!scope || !supervisionId) return null;

  async function send(url: string, init: RequestInit, onOk: () => void) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(url, init);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ tone: "error", text: Array.isArray(body.errors) ? body.errors.join(" ") : noteMessage(body.code, body) });
        if (body.code === "revision_conflict") bump?.();
        return;
      }
      onOk();
      bump?.();
    } catch {
      setMessage({ tone: "error", text: "Opération impossible : réseau interrompu." });
    } finally {
      setBusy(false);
    }
  }

  const add = () =>
    send(
      `/api/supervision/${supervisionId}/notes`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: draft, eventRef, eventTitle, key: keyRef.current }) },
      () => {
        setDraft("");
        keyRef.current = newKey();
        setMessage({ tone: "ok", text: "Note enregistrée." });
      },
    );

  const saveEdit = () => {
    if (!editing) return;
    return send(
      `/api/supervision/${supervisionId}/notes/${editing.id}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: editing.text, revision: editing.revision }) },
      () => {
        setEditing(null);
        setMessage({ tone: "ok", text: "Note modifiée." });
      },
    );
  };

  const remove = (id: string) =>
    send(`/api/supervision/${supervisionId}/notes/${id}`, { method: "DELETE" }, () => {
      setDeleting(null);
      setMessage({ tone: "ok", text: "Note supprimée." });
    });

  return (
    <div className={styles.stack}>
      {!readOnly ? (
        <>
          <textarea
            className={styles.textarea}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={eventRef ? "Une note sur cette publication…" : "Une note sur cette Supervision…"}
            rows={compact ? 2 : 4}
            maxLength={NOTE_MAX}
            aria-label={eventRef ? "Nouvelle note sur cette publication" : "Nouvelle note"}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}>
            <button type="button" onClick={() => void add()} disabled={busy || draft.trim().length === 0} style={{ cursor: "pointer" }}>
              Ajouter la note
            </button>
            <span className={styles.muted}>{draft.length}/{NOTE_MAX}</span>
          </div>
        </>
      ) : (
        <p className={styles.muted}>Cette Supervision est en lecture seule : tes notes restent consultables.</p>
      )}
      {message ? (
        <p className={message.tone === "error" ? undefined : styles.muted} role={message.tone === "error" ? "alert" : "status"} style={message.tone === "error" ? { color: "#d94a4a" } : undefined}>
          {message.text}
        </p>
      ) : null}
      {loadError ? <p className={styles.muted} role="alert">{loadError}</p> : null}
      {notes === null && !loadError ? <p className={styles.muted}>Chargement des notes…</p> : null}
      {notes && notes.length === 0 ? <p className={styles.muted}>{eventRef ? "Aucune note sur cette publication." : "Aucune note pour l'instant. Une note est privée : elle n'est visible que depuis ton compte."}</p> : null}
      {notes && notes.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {notes.map((note) => (
            <li key={note.id} style={{ borderTop: "1px solid rgba(128,128,128,.25)", paddingTop: 8 }}>
              <div className={styles.muted} style={{ fontSize: 12 }}>
                {dateFormat.format(new Date(note.createdAt))}
                {note.revision > 1 ? ` · modifiée le ${dateFormat.format(new Date(note.updatedAt))}` : ""}
                {(!eventRef || note.eventRef !== eventRef) && note.eventTitle ? ` · sur « ${note.eventTitle} »` : ""}
              </div>
              {editing?.id === note.id ? (
                <>
                  <textarea
                    className={styles.textarea}
                    value={editing.text}
                    onChange={(event) => setEditing({ ...editing, text: event.target.value })}
                    rows={4}
                    maxLength={NOTE_MAX}
                    aria-label="Modifier la note"
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button type="button" onClick={() => void saveEdit()} disabled={busy || editing.text.trim().length === 0} style={{ cursor: "pointer" }}>Enregistrer</button>
                    <button type="button" onClick={() => setEditing(null)} disabled={busy} style={{ cursor: "pointer" }}>Annuler</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: "4px 0" }}>{note.body}</p>
                  {!readOnly ? (
                    deleting === note.id ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <span className={styles.muted}>Supprimer cette note ? Elle disparaît de ta liste.</span>
                        <button type="button" onClick={() => void remove(note.id)} disabled={busy} style={{ cursor: "pointer" }}>Supprimer</button>
                        <button type="button" onClick={() => setDeleting(null)} disabled={busy} style={{ cursor: "pointer" }}>Annuler</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => { setDeleting(null); setEditing({ id: note.id, text: note.body, revision: note.revision }); }} style={{ cursor: "pointer" }}>Modifier</button>
                        <button type="button" onClick={() => { setEditing(null); setDeleting(note.id); }} style={{ cursor: "pointer" }}>Supprimer</button>
                      </div>
                    )
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
