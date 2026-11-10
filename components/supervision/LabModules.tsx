"use client";

import { createContext, memo, useContext, useMemo, useState } from "react";
import { GEONAMES_ATTRIBUTION } from "@/lib/supervision/geo/gazetteer";
import { useOpenEvent } from "./EventDetail";
import AlertsPanel, { useAlertsScope } from "./AlertsPanel";
import NotesPanel, { useNotesScope } from "./NotesPanel";
import { PRIORITY_LABELS, VERIFICATION_LABELS, type BoardEvent, type Priority } from "@/lib/supervision/dashboard/fixtures";
import { fitProjection, ringsToPath, type DataContext } from "@/lib/supervision/dashboard/geo";
import type { Band } from "@/lib/supervision/dashboard/layout";
import type { ModuleKind } from "@/lib/supervision/dashboard/modules";
import styles from "./Lab.module.css";

// Contenu des huit modules. Chacun reçoit les MÊMES données déjà filtrées et ne change que son niveau de détail selon le
// rendu (compact, standard, développé) : jamais d'appel IA au redimensionnement (cahier des charges F04). Données fictives.

interface BodyProps {
  band: Band;
  events: BoardEvent[];
  now: number;
  /** Présent seulement pour des données RÉELLES ; absent = données fictives du prototype. */
  data?: DataContext;
}

const PRIORITY_COLOR: Record<Priority, string> = { information: "#3d9be9", importante: "#e87932", critique: "#d94a4a" };

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

function count(events: BoardEvent[], priority: Priority): number {
  return events.filter((e) => e.priority === priority).length;
}

function Chip({ priority }: { priority: Priority }) {
  return (
    <span className={styles.chip} style={{ borderColor: PRIORITY_COLOR[priority], color: PRIORITY_COLOR[priority] }}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

/** Nombre total d'éléments du périmètre (avant filtres) ; null pour les données fictives du prototype. */
const TotalContext = createContext<number | null>(null);

function Empty() {
  const total = useContext(TotalContext);
  if (total === 0) return <p className={styles.muted}>Aucun article ni signalement retrouvé pour ce périmètre sur la période chargée. Ce n&apos;est pas une preuve qu&apos;il ne s&apos;y passe rien : la couverture des sources est partielle.</p>;
  if (total !== null) return <p className={styles.muted}>Aucun résultat avec ces filtres, alors que {total} élément{total > 1 ? "s" : ""} existe{total > 1 ? "nt" : ""} sur la période chargée : élargis la période ou le thème.</p>;
  return <p className={styles.muted}>Aucun résultat dans la collecte disponible pour ces filtres.</p>;
}

/** Titre d'un événement : ouvre « sources et preuves ». */
function EventLink({ event }: { event: BoardEvent }) {
  const open = useOpenEvent();
  return (
    <button type="button" className={styles.srcLink} onClick={() => open(event)}>
      {event.title}
    </button>
  );
}

const THEME_LABEL: Record<BoardEvent["theme"], string> = { conflits: "Conflits", securite: "Sécurité", politique: "Politique", humanitaire: "Humanitaire" };

function topCounts(values: string[], limit: number): { label: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, n]) => ({ label, n }));
}

/** Résumé CALCULÉ (comptages et faits marquants), sans IA : aucun coût, rien d'inventé. Une vraie synthèse rédigée viendra avec le budget IA. */
function RealSummaryBody({ band, events, data }: BodyProps) {
  const critical = count(events, "critique");
  const important = count(events, "importante");
  const articles = events.filter((e) => e.kind === "article").length;
  const signals = events.length - articles;
  const rank = { critique: 0, importante: 1, information: 2 } as const;
  const notable = events
    .filter((e) => e.priority !== "information")
    .sort((a, b) => rank[a.priority] - rank[b.priority] || b.at.localeCompare(a.at))
    .slice(0, band === "expanded" ? 6 : 3);
  const themes = topCounts(events.map((e) => THEME_LABEL[e.theme]), 3);
  // Seuls les articles ont de vrais lieux : le « lieu » d'un signalement est le pays, ce qui écraserait tout le classement.
  const places = topCounts(events.filter((e) => e.kind === "article").map((e) => e.place).filter((place) => place !== "Lieu non précisé"), 3);
  const domains = topCounts(events.flatMap((e) => e.domains ?? []), 6);
  if (band === "compact") {
    return <p className={styles.lead}>{events.length} éléments, dont {critical} critique{critical > 1 ? "s" : ""} et {important} importante{important > 1 ? "s" : ""}.</p>;
  }
  return (
    <div className={styles.stack}>
      <p className={styles.lead}>
        {events.length} éléments sur la période : {articles} article{articles > 1 ? "s" : ""} analysé{articles > 1 ? "s" : ""} et {signals} signalement{signals > 1 ? "s" : ""} médiatique{signals > 1 ? "s" : ""}, dont {critical} de priorité critique et {important} importante{important > 1 ? "s" : ""}.
      </p>
      {themes.length ? <p>Thèmes les plus présents : {themes.map((t) => `${t.label} (${t.n})`).join(", ")}.</p> : null}
      {places.length ? <p>Lieux les plus cités dans les articles : {places.map((t) => `${t.label} (${t.n})`).join(", ")}.</p> : null}
      {notable.length ? (
        <>
          <h4 className={styles.h4}>Faits marquants</h4>
          <ul className={styles.bullets}>
            {notable.map((e) => (
              <li key={e.id}>
                <EventLink event={e} /> — {formatDay(e.at)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className={styles.muted}>
        {data?.latest ? `Dernier fait retrouvé : ${formatDay(data.latest)} ` : ""}
        Limites : résumé calculé automatiquement, sans IA, à partir des articles et signalements disponibles. Un signalement médiatique n&apos;est pas un fait confirmé.
      </p>
      {band === "expanded" && domains.length ? (
        <>
          <h4 className={styles.h4}>Sources les plus fréquentes</h4>
          <p className={styles.muted}>{domains.map((d) => `${d.label} (${d.n})`).join(" · ")}</p>
        </>
      ) : null}
    </div>
  );
}

function SummaryBody(props: BodyProps) {
  const { band, events } = props;
  if (events.length === 0) return <Empty />;
  if (props.data) return <RealSummaryBody {...props} />;
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

/** Carte RÉELLE : contour du pays en fond, événements aux coordonnées retrouvées. Ceux sans coordonnées ne sont pas dessinés (ils restent dans le flux). */
function RealMapBody({ band, events, data }: BodyProps) {
  const open = useOpenEvent();
  const area = data?.area ?? null;
  const projection = useMemo(() => (area ? fitProjection(area) : null), [area]);
  if (!projection || !area) return <p className={styles.muted}>Fond de carte indisponible pour ce périmètre.</p>;
  const located = events.filter((e) => e.lat !== undefined && e.lon !== undefined && projection.inside(e.lon, e.lat));
  const shown = band === "compact" ? located.filter((e) => e.priority !== "information") : located;
  const withoutPlace = events.length - events.filter((e) => e.lat !== undefined).length;
  const outside = events.filter((e) => e.lat !== undefined && e.lon !== undefined && !projection.inside(e.lon, e.lat)).length;
  if (events.length === 0) return <Empty />;
  return (
    <div className={styles.mapWrap}>
      <svg className={styles.map} viewBox={`0 0 ${projection.width} ${projection.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Carte des événements du périmètre">
        <rect width={projection.width} height={projection.height} className={styles.mapBg} />
        <path d={ringsToPath(area.rings, projection)} className={styles.mapLand} />
        {shown.map((e) => {
          const { x, y } = projection.project(e.lon!, e.lat!);
          return (
            <circle key={e.id} cx={x} cy={y} r={e.priority === "critique" ? 1.6 : 1.1} fill={PRIORITY_COLOR[e.priority]} opacity={0.85} style={{ cursor: "pointer" }} onClick={() => open(e)}>
              <title>{`${e.title} — ${e.place} — ${formatDay(e.at)}`}</title>
            </circle>
          );
        })}
      </svg>
      {band !== "compact" ? (
        <div className={styles.legend}>
          {(["critique", "importante", "information"] as Priority[]).map((p) => (
            <span key={p}>
              <i style={{ background: PRIORITY_COLOR[p] }} /> {PRIORITY_LABELS[p]}
            </span>
          ))}
          <span className={styles.muted}>
            {located.length} localisé{located.length > 1 ? "s" : ""}
            {withoutPlace + outside > 0 ? ` · ${withoutPlace + outside} sans position utilisable (dans le flux)` : ""}
          </span>
          {located.some((e) => e.geo) ? <span className={styles.muted}>{GEONAMES_ATTRIBUTION}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function MapBody(props: BodyProps) {
  const { band, events } = props;
  if (props.data) return <RealMapBody {...props} />;
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
          <circle key={e.id} cx={e.x ?? 0} cy={e.y ?? 0} r={e.priority === "critique" ? 2.6 : 1.8} fill={PRIORITY_COLOR[e.priority]} opacity={0.9}>
            <title>{`${e.title} — ${e.place}`}</title>
          </circle>
        ))}
        {band === "expanded"
          ? events
              .filter((e) => e.priority === "critique")
              .slice(0, 6)
              .map((e) => (
                <text key={`t${e.id}`} x={(e.x ?? 0) + 3} y={(e.y ?? 0) - 2} className={styles.mapLabel}>
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
          <strong><EventLink event={e} /></strong>
          {band !== "compact" ? (
            <span className={styles.meta}>
              <Chip priority={e.priority} /> {VERIFICATION_LABELS[e.verification]} · {formatDay(e.at)}
              {band === "expanded" ? ` · ${e.place} · ${e.publications} publication${e.publications > 1 ? "s" : ""}${e.domains?.length ? ` · ${e.domains[0]}` : ""}` : ""}
              {e.story ? ` · même histoire reprise par ${e.story.members.length} autre${e.story.members.length > 1 ? "s" : ""}` : ""}
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
              <strong>{formatDay(e.at)}</strong> — <EventLink event={e} />
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
          <strong>{formatDay(e.at)}</strong> {band === "standard" ? <>— <EventLink event={e} /></> : ""}
        </li>
      ))}
    </ul>
  );
}

/** Alertes d'une Supervision réelle (décisions enregistrées) ; dans le prototype, la liste fictive ci-dessous. */
function AlertsBody(props: BodyProps) {
  const scope = useAlertsScope();
  return scope ? <AlertsPanel band={props.band} events={props.events} /> : <PrototypeAlertsBody {...props} />;
}

function PrototypeAlertsBody({ band, events }: BodyProps) {
  const [read, setRead] = useState<Set<string>>(new Set());
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
          <strong><EventLink event={e} /></strong>
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

/** Notes enregistrées sur une Supervision réelle ; dans le prototype (sans Supervision), le bloc-notes local ci-dessous. */
function NotesBody(props: BodyProps) {
  const scope = useNotesScope();
  return scope ? <NotesPanel compact={props.band === "compact"} /> : <PrototypeNotesBody {...props} />;
}

function PrototypeNotesBody({ band }: BodyProps) {
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
  return (
    <TotalContext.Provider value={props.data ? props.data.total : null}>
      <ModuleBodySwitch kind={kind} {...props} />
    </TotalContext.Provider>
  );
}

function ModuleBodySwitch({ kind, ...props }: BodyProps & { kind: ModuleKind }) {
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
