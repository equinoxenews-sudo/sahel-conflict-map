"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { lifecycleMessage } from "@/lib/supervision/core/lifecycleMessages";
import styles from "./Supervision.module.css";

// Cycle de vie de CETTE Supervision : activer, mettre en pause, reprendre, supprimer un brouillon. Chaque action demande une
// confirmation qui explique ses conséquences. Un même clic envoie une même clé d'opération : un double clic ou une relance ne fait rien
// de plus (voir les routes /activate, /pause, /resume). Aucune IA, aucun coût.

type Action = "activate" | "pause" | "resume" | "delete";

const TEXTS: Record<Action, { button: string; title: string; body: string; confirm: string }> = {
  activate: {
    button: "Activer la Supervision",
    title: "Activer cette Supervision ?",
    body: "Une première collecte de presse est lancée tout de suite (jusqu'à une minute), puis la Supervision est collectée régulièrement. Si cette première collecte échoue, rien n'est consommé et elle reste un brouillon.",
    confirm: "Activer",
  },
  pause: {
    button: "Mettre en pause",
    title: "Mettre cette Supervision en pause ?",
    body: "La collecte, les analyses et les notifications s'arrêtent, et une place active est libérée. Le tableau, l'historique et le périmètre restent consultables et modifiables. Aucun crédit n'est consommé.",
    confirm: "Mettre en pause",
  },
  resume: {
    button: "Reprendre",
    title: "Reprendre cette Supervision ?",
    body: "La collecte reprend à partir d'aujourd'hui, sans reconstituer tout l'historique de la pause. Une place active doit être libre. Aucun crédit n'est consommé.",
    confirm: "Reprendre",
  },
  delete: {
    button: "Supprimer le brouillon",
    title: "Supprimer ce brouillon ?",
    body: "Il disparaît de ta liste et libère une place de brouillon. Une Supervision activée ne peut pas être supprimée ici.",
    confirm: "Supprimer",
  },
};

const ACTIONS_BY_STATE: Record<string, Action[]> = {
  draft: ["activate", "delete"],
  error: ["activate"],
  active: ["pause"],
  paused: ["resume"],
};

const STATE_TEXT: Record<string, string> = {
  draft: "Brouillon : tu peux cadrer le périmètre et lancer des collectes d'essai (gratuites, sans IA). L'activation lance la collecte régulière.",
  initializing: "Initialisation en cours : la première collecte est en train de remplir le tableau.",
  active: "Active : la Supervision est collectée régulièrement.",
  paused: "En pause : aucune collecte ni notification. Le tableau reste consultable et modifiable.",
  error: "Cette Supervision est en erreur : l'activation peut être retentée.",
  read_only_grace: "Lecture seule : consultation et export uniquement.",
  pending_deletion: "Suppression en cours : consultation et export uniquement.",
};

export default function LifecyclePanel({ id, state, onStateChange }: { id: string; state: string; onStateChange: (state: string) => void }) {
  const router = useRouter();
  const [asking, setAsking] = useState<{ action: Action; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const actions = ACTIONS_BY_STATE[state] ?? [];
  const ask = (action: Action) => {
    setMessage(null);
    // La clé naît à l'ouverture de la confirmation : un double clic sur « Confirmer » la rejoue, une nouvelle confirmation en crée une neuve.
    setAsking({ action, key: `${action}-${crypto.randomUUID()}` });
  };

  async function run() {
    if (!asking) return;
    const { action, key } = asking;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(action === "delete" ? `/api/supervision/${id}` : `/api/supervision/${id}/${action}`, {
        method: action === "delete" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ key }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ tone: "error", text: lifecycleMessage(body.code, body) });
        if (body.code === "invalid_state") onStateChange(typeof body.state === "string" ? body.state : state);
        return;
      }
      setAsking(null);
      if (action === "delete") {
        router.push("/mon-espace/supervision");
        return;
      }
      onStateChange(String(body.state));
      setMessage({ tone: "ok", text: action === "activate" ? "Supervision activée : la première collecte a rempli le tableau." : action === "pause" ? "Supervision mise en pause." : "Supervision reprise." });
    } catch {
      setMessage({ tone: "error", text: "Opération impossible : réseau indisponible." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.history} style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center" }}>
        <strong>État</strong>
        <span className={styles.muted}>{STATE_TEXT[state] ?? state}</span>
        {!asking
          ? actions.map((action) => (
              <button key={action} type="button" className={action === "activate" || action === "resume" ? styles.primary : undefined} style={action === "activate" || action === "resume" ? undefined : { cursor: "pointer" }} onClick={() => ask(action)} disabled={busy}>
                {TEXTS[action].button}
              </button>
            ))
          : null}
      </div>
      {asking ? (
        <div className={styles.notice} role="alertdialog" aria-label={TEXTS[asking.action].title} style={{ marginTop: 8 }}>
          <strong>{TEXTS[asking.action].title}</strong>
          <span>{busy && asking.action === "activate" ? "Première collecte en cours… (jusqu'à une minute)" : TEXTS[asking.action].body}</span>
          <button type="button" onClick={() => void run()} disabled={busy}>{busy ? "En cours…" : TEXTS[asking.action].confirm}</button>
          <button type="button" onClick={() => setAsking(null)} disabled={busy}>Annuler</button>
        </div>
      ) : null}
      {message ? (
        <p className={message.tone === "error" ? styles.error : styles.muted} role={message.tone === "error" ? "alert" : "status"} style={{ marginTop: 6 }}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
