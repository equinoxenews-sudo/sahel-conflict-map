"use client";

import { memo, useState } from "react";
import { PRIORITY_LABELS, VERIFICATION_LABELS, type FakeEvent, type Priority } from "@/lib/supervision/lab/fixtures";
import type { Band } from "@/lib/supervision/lab/layout";
import type { ModuleKind } from "@/lib/supervision/lab/modules";
import styles from "./Lab.module.css";

// Contenu des huit modules. Chacun reçoit les MÊMES données déjà filtrées et ne change que son niveau de détail selon le
// rendu (compact, standard, développé) : jamais d'appel IA au redimensionnement (cahier des charges F04). Données fictives.

interface BodyProps {
  band: Band;
  events: FakeEvent[];
  now: number;
}

const PRIORITY_COLOR: Record<Priority, string> = { information: "#3d9be9", importante: "#e87932", critique: "#d94a4a" };

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

function count(events: FakeEvent[], priority: Priority): number {
  return events.filter((e) => e.priority === priority).length;
}

function Chip({ priority }: { priority: Priority }) {
  return (
    <span className={styles.chip} style={{ borderColor: PRIORITY_COLOR[priority], color: PRIORITY_COLOR[priority] }}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function Empty() {
  return <p className={styles.muted}>Aucun résultat dans la collecte disponible pour ces filtres.</p>;
}

function SummaryBody({ band, events }: BodyProps) {
  if (events.length === 0) return <Empty />;
  const critical = count(events, "critique");
  const top = events.filter((e) => e.priority !== "information").slice(0, 3);
  if (band === "compact") {
    return (
      <div>
        <p className={styles.lead}>{events.length} événements fictifs, dont {critical} critique{critical > 1 ? "s" : ""}.</p>
      </div>
    );
  }
  return (
    <div className={styles.stack}>
      <p className={styles.lead}>
        Résumé fictif : {events.length} événements sur la période, dont {critical} de priorité critique. Rien de réel dans ce texte.
      </p>
      <ul className={styles.bullets}>
        {top.map((e) => (
          <li key={e.id}>
            {e.title} — {e.place}
          </li>
        ))}
      </ul>
      <p className={styles.muted}>Limites : données fictives, aucune vérification réelle.</p>
      {band === "expanded" ? (
        <>
          <h4 className={styles.h4}>Analyse</h4>
          <p>
            Paragraphe d&apos;analyse fictif, visible seulement quand le module est grand. Le niveau de détail dépend de la taille du module, pas d&apos;un nouvel appel
            à une IA : ce sont les mêmes données, montrées plus en détail.
          </p>
          <h4 className={styles.h4}>Sources</h4>
          <p className={styles.muted}>Source fictive A · Source fictive B · Source fictive C</p>
        </>
      ) : null}
    </div>
  );
}

function MapBody({ band, events }: BodyProps) {
  if (events.length === 0) return <Empty />;
  const shown = band === "compact" ? events.filter((e) => e.priority !== "information") : events;
  return (
    <div className={styles.mapWrap}>
      <svg className={styles.map} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Carte schématique fictive">
        <rect width="100" height="100" className={styles.mapBg} />
        {band !== "compact"
          ? [20, 40, 60, 80].flatMap((v) => [
              <line key={`h${v}`} x1="0" y1={v} x2="100" y2={v} className={styles.mapGrid} />,
              <line key={`v${v}`} x1={v} y1="0" x2={v} y2="100" className={styles.mapGrid} />,
            ])
          : null}
        {shown.map((e) => (
          <circle key={e.id} cx={e.x} cy={e.y} r={e.priority === "critique" ? 2.6 : 1.8} fill={PRIORITY_COLOR[e.priority]} opacity={0.9}>
            <title>{`${e.title} — ${e.place}`}</title>
          </circle>
        ))}
        {band === "expanded"
          ? events
              .filter((e) => e.priority === "critique")
              .slice(0, 6)
              .map((e) => (
                <text key={`t${e.id}`} x={e.x + 3} y={e.y - 2} className={styles.mapLabel}>
                  {e.place.replace("Zone fictive ", "")}
                </text>
              ))
          : null}
      </svg>
      {band !== "compact" ? (
        <div className={styles.legend}>
          {(["critique", "importante", "information"] as Priority[]).map((p) => (
            <span key={p}>
              <i style={{ background: PRIORITY_COLOR[p] }} /> {PRIORITY_LABELS[p]}
            </span>
          ))}
          <span className={styles.muted}>Fond schématique, positions abstraites</span>
        </div>
      ) : null}
    </div>
  );
}

function FeedBody({ band, events }: BodyProps) {
  if (events.length === 0) return <Empty />;
  const limit = band === "compact" ? 3 : band === "standard" ? 7 : 14;
  return (
    <ul className={styles.list}>
      {events.slice(0, limit).map((e) => (
        <li key={e.id}>
          <strong>{e.title}</strong>
          {band !== "compact" ? (
            <span className={styles.meta}>
              <Chip priority={e.priority} /> {VERIFICATION_LABELS[e.verification]} · {formatDay(e.at)}
              {band === "expanded" ? ` · ${e.place} · ${e.publications} publication${e.publications > 1 ? "s" : ""}` : ""}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function TimelineBody({ band, events, now }: BodyProps) {
  if (events.length === 0) return <Empty />;
  if (band === "expanded") {
    const first = Math.min(...events.map((e) => Date.parse(e.at)));
    const span = Math.max(1, now - first);
    return (
      <div className={styles.stack}>
        <svg viewBox="0 0 100 18" className={styles.frise} role="img" aria-label="Frise chronologique fictive">
          <line x1="2" y1="9" x2="98" y2="9" className={styles.mapGrid} />
          {events.map((e) => (
            <circle key={e.id} cx={2 + ((Date.parse(e.at) - first) / span) * 96} cy={e.priority === "critique" ? 5 : e.priority === "importante" ? 9 : 13} r="1.3" fill={PRIORITY_COLOR[e.priority]} />
          ))}
        </svg>
        <ul className={styles.list}>
          {events.slice(0, 6).map((e) => (
            <li key={e.id}>
              <strong>{formatDay(e.at)}</strong> — {e.title}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ul className={styles.list}>
      {events.slice(0, band === "compact" ? 4 : 8).map((e) => (
        <li key={e.id}>
          <strong>{formatDay(e.at)}</strong> {band === "standard" ? `— ${e.title}` : ""}
        </li>
      ))}
    </ul>
  );
}

function AlertsBody({ band, events }: BodyProps) {
  const [read, setRead] = useState<Set<number>>(new Set());
  const urgent = events.filter((e) => e.priority !== "information");
  if (urgent.length === 0) return <Empty />;
  if (band === "compact") {
    return (
      <div className={styles.kpis}>
        <div><b style={{ color: PRIORITY_COLOR.critique }}>{count(events, "critique")}</b><span>critiques</span></div>
        <div><b style={{ color: PRIORITY_COLOR.importante }}>{count(events, "importante")}</b><span>importantes</span></div>
      </div>
    );
  }
  return (
    <ul className={styles.list}>
      {urgent.slice(0, band === "standard" ? 4 : 8).map((e) => (
        <li key={e.id} className={read.has(e.id) ? styles.read : undefined}>
          <strong>{e.title}</strong>
          <span className={styles.meta}>
            <Chip priority={e.priority} /> {VERIFICATION_LABELS[e.verification]}
            {band === "expanded" ? (
              <button type="button" className={styles.linkBtn} onClick={() => setRead((s) => new Set(s).add(e.id))}>
                {read.has(e.id) ? "lue" : "marquer lue"}
              </button>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatsBody({ band, events }: BodyProps) {
  if (events.length === 0) return <Empty />;
  const themes = ["conflits", "securite", "politique", "humanitaire"] as const;
  const byTheme = themes.map((t) => ({ t, n: events.filter((e) => e.theme === t).length }));
  const max = Math.max(1, ...byTheme.map((x) => x.n));
  return (
    <div className={styles.stack}>
      <div className={styles.kpis}>
        <div><b>{events.length}</b><span>événements</span></div>
        <div><b style={{ color: PRIORITY_COLOR.critique }}>{count(events, "critique")}</b><span>critiques</span></div>
        {band === "expanded" ? <div><b>{new Set(events.map((e) => e.place)).size}</b><span>zones</span></div> : null}
      </div>
      {band !== "compact" ? (
        <div className={styles.bars}>
          {byTheme.map(({ t, n }) => (
            <div key={t} className={styles.barRow}>
              <span>{t}</span>
              <div><i style={{ width: `${(n / max) * 100}%` }} /></div>
              <em>{n}</em>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AssistantBody({ band }: BodyProps) {
  return (
    <div className={styles.stack}>
      {band !== "compact" ? (
        <>
          <p className={styles.bubbleUser}>Que s&apos;est-il passé dans la zone Alpha cette semaine ?</p>
          <p className={styles.bubble}>
            Réponse fictive du prototype : aucun appel à une IA. Le vrai assistant citera uniquement des sources réelles, avec leurs dates et leurs limites.
          </p>
        </>
      ) : null}
      {band === "expanded" ? <p className={styles.muted}>Historique : 2 conversations fictives · même historique que le panneau global.</p> : null}
      <input className={styles.input} placeholder="Interroger ma Supervision…" disabled aria-label="Question (désactivé dans le prototype)" />
    </div>
  );
}

function NotesBody({ band }: BodyProps) {
  const [text, setText] = useState("");
  return (
    <div className={styles.stack}>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Notes personnelles (non enregistrées dans le prototype)"
        rows={band === "compact" ? 2 : 5}
        aria-label="Notes"
      />
      {band === "expanded" ? (
        <>
          <h4 className={styles.h4}>Analyses enregistrées</h4>
          <p className={styles.muted}>Aucune analyse enregistrée (fictif). Une analyse d&apos;origine reste immuable ; une note dérivée garde sa provenance.</p>
        </>
      ) : null}
    </div>
  );
}

function ModuleBodyView({ kind, ...props }: BodyProps & { kind: ModuleKind }) {
  switch (kind) {
    case "summary":
      return <SummaryBody {...props} />;
    case "map":
      return <MapBody {...props} />;
    case "feed":
      return <FeedBody {...props} />;
    case "timeline":
      return <TimelineBody {...props} />;
    case "alerts":
      return <AlertsBody {...props} />;
    case "stats":
      return <StatsBody {...props} />;
    case "assistant":
      return <AssistantBody {...props} />;
    case "notes":
      return <NotesBody {...props} />;
  }
}

/** Mémoïsé : tant que ses données et son niveau de détail ne changent pas, un module n'est pas redessiné (par exemple pendant qu'on déplace son voisin). */
export const ModuleBody = memo(ModuleBodyView);
