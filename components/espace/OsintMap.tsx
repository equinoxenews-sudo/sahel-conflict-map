"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  CATEGORY_NOTES,
  OSINT_DATA_URL,
  OSINT_FR_URL,
  OSINT_LICENSE_URL,
  ROOT_ID,
  ancestorsOf,
  countTools,
  displayName,
  findNode,
  idsToReveal,
  layoutTree,
  pathNames,
  pickText,
  safeToolUrl,
  searchTree,
  toolFacts,
  type OsintNode,
  type OsintTranslations,
  type SearchHit,
} from "@/lib/osintFramework";
import styles from "./OsintMap.module.css";

const LABEL_MAX = 34;
const CHAR_WIDTH = 6.6;

function shortLabel(name: string): string {
  const label = displayName(name);
  return label.length > LABEL_MAX ? `${label.slice(0, LABEL_MAX - 1)}…` : label;
}

// Carte mentale des outils OSINT : on déplie les catégories d'un clic, on tire la carte à la souris, on cherche un
// outil par son nom ; l'encadré du bas explique l'outil ou la catégorie sélectionnés.
export default function OsintMap() {
  const [root, setRoot] = useState<OsintNode | null>(null);
  const [translations, setTranslations] = useState<OsintTranslations | null>(null);
  const [failed, setFailed] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // La liste de suggestions se ferme dès qu'on en choisit une (ou qu'on appuie sur Échap), et se rouvre en tapant.
  const [suggest, setSuggest] = useState(true);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const handledFocus = useRef<number | null>(null);
  const focusCount = useRef(0);
  const drag = useRef({ active: false, x: 0, y: 0, left: 0, top: 0, moved: false });
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(OSINT_DATA_URL)
      .then((res) => (res.ok ? (res.json() as Promise<OsintNode>) : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (!cancelled) setRoot(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    // Traduction française : facultative, absente tant qu'elle n'a pas été générée.
    fetch(OSINT_FR_URL)
      .then((res) => (res.ok ? (res.json() as Promise<OsintTranslations>) : null))
      .then((data) => {
        if (!cancelled && data && typeof data === "object") setTranslations(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const hits = useMemo(() => (root ? searchTree(root, query) : []), [root, query]);
  const hitIds = useMemo(() => new Set(hits.map((hit) => hit.id)), [hits]);
  // Catégories dépliées : celles ouvertes à la main, plus celles qui mènent aux réponses d'une recherche, moins celles
  // que l'on referme pendant une recherche.
  const expanded = useMemo(() => {
    const ids = new Set<string>([...opened, ...idsToReveal(hits)]);
    for (const id of closed) ids.delete(id);
    return ids;
  }, [opened, hits, closed]);
  const layout = useMemo(() => (root ? layoutTree(root, expanded) : null), [root, expanded]);
  const selected = root && selectedId ? findNode(root, selectedId) : null;

  useEffect(() => {
    if (!focus || !layout || handledFocus.current === focus.nonce) return;
    const target = layout.nodes.find((n) => n.id === focus.id);
    const el = viewport.current;
    if (!target || !el) return;
    handledFocus.current = focus.nonce;
    el.scrollTo({ left: Math.max(0, target.x - el.clientWidth / 3), top: Math.max(0, target.y - el.clientHeight / 2), behavior: "smooth" });
  }, [focus, layout]);

  function toggle(id: string) {
    if (expanded.has(id)) {
      setOpened((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setClosed((prev) => new Set(prev).add(id));
    } else {
      setClosed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setOpened((prev) => new Set(prev).add(id));
    }
  }

  function activate(id: string, node: OsintNode) {
    setSelectedId(id);
    if (node.children?.length && id !== ROOT_ID) toggle(id);
  }

  function pick(hit: SearchHit) {
    setOpened((prev) => new Set([...prev, ...ancestorsOf(hit.id), ...(hit.node.children?.length ? [hit.id] : [])]));
    setClosed(new Set());
    setSuggest(false);
    setSelectedId(hit.id);
    focusCount.current += 1;
    setFocus({ id: hit.id, nonce: focusCount.current });
  }

  function onNodeKey(event: KeyboardEvent, id: string, node: OsintNode) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(id, node);
    }
  }

  // Tirer la carte à la souris (la molette et la barre de défilement fonctionnent aussi).
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const el = viewport.current;
    if (event.pointerType !== "mouse" || event.button !== 0 || !el || (event.target as Element).closest("[data-node]")) return;
    drag.current = { active: true, x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
    setGrabbing(true);
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = viewport.current;
    const g = drag.current;
    if (!g.active || !el) return;
    el.scrollLeft = g.left - (event.clientX - g.x);
    el.scrollTop = g.top - (event.clientY - g.y);
  }
  function endDrag() {
    drag.current.active = false;
    setGrabbing(false);
  }

  const toolCount = root ? countTools(root) : 0;
  const searching = query.trim().length >= 2;

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <div className={styles.searchBox}>
          <input
            type="search"
            className={styles.search}
            placeholder="Rechercher un outil ou une catégorie…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setClosed(new Set());
              setSuggest(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSuggest(false);
              if (event.key === "Enter" && hits[0]) pick(hits[0]);
            }}
            onFocus={() => setSuggest(true)}
            aria-label="Rechercher un outil"
          />
          {searching && suggest && hits.length > 0 && (
            <ul className={styles.suggestions}>
              {hits.slice(0, 8).map((hit) => (
                <li key={hit.id}>
                  <button type="button" className={styles.suggestion} onClick={() => pick(hit)}>
                    <span className={styles.suggestionName}>{displayName(hit.node.name)}</span>
                    <span className={styles.suggestionPath}>{root ? pathNames(root, hit.id).slice(1, -1).join(" › ") : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className={styles.count} aria-live="polite">
          {searching ? `${hits.length} résultat${hits.length > 1 ? "s" : ""}` : root ? `${toolCount} outils` : ""}
        </span>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            setOpened(new Set());
            setClosed(new Set());
            setQuery("");
          }}
        >
          Tout replier
        </button>
      </div>

      <div
        ref={viewport}
        className={grabbing ? `${styles.canvas} ${styles.grabbing}` : styles.canvas}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {failed && <p className={styles.state}>La carte des outils n&apos;a pas pu être chargée. Rechargez la page.</p>}
        {!root && !failed && <p className={styles.state}>Chargement de la carte des outils…</p>}
        {layout && (
          <svg width={layout.width} height={layout.height} role="tree" aria-label="Carte des outils OSINT">
            <g>
              {layout.links.map((link) => (
                <path
                  key={link.id}
                  className={styles.link}
                  d={`M${link.x1},${link.y1} C${(link.x1 + link.x2) / 2},${link.y1} ${(link.x1 + link.x2) / 2},${link.y2} ${link.x2},${link.y2}`}
                />
              ))}
            </g>
            {layout.nodes.map((item) => {
              const isFolder = item.hasChildren;
              const label = shortLabel(item.node.name);
              const isSelected = item.id === selectedId;
              const isHit = hitIds.has(item.id);
              const dim = item.node.status === "down" || item.node.status === "defunct" || item.node.deprecated;
              const labelWidth = label.length * CHAR_WIDTH + 16;
              const cls = [
                styles.node,
                isFolder ? styles.folder : styles.tool,
                item.expanded ? styles.open : "",
                isSelected ? styles.selected : "",
                isHit ? styles.hit : "",
                dim ? styles.dim : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <g
                  key={item.id}
                  data-node
                  className={cls}
                  transform={`translate(${item.x},${item.y})`}
                  role="treeitem"
                  tabIndex={0}
                  aria-expanded={isFolder ? item.expanded : undefined}
                  aria-selected={isSelected}
                  onClick={() => activate(item.id, item.node)}
                  onKeyDown={(event) => onNodeKey(event, item.id, item.node)}
                >
                  <title>{displayName(item.node.name)}</title>
                  <rect className={styles.hitArea} x={isFolder ? -labelWidth - 12 : -8} y={-10} width={labelWidth + 22} height={20} rx={6} />
                  <circle className={styles.dot} r={isFolder ? 5.5 : 4} />
                  <text className={styles.label} x={isFolder ? -11 : 11} dy="0.33em" textAnchor={isFolder ? "end" : "start"}>
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <section className={styles.panel} aria-live="polite">
        <h2 className={styles.panelKicker}>Explication rapide de l&apos;outil</h2>
        {!selected || !root || !selectedId ? (
          <p className={styles.hint}>
            Cliquez sur une catégorie pour la déplier, ou sur un outil pour lire à quoi il sert et comment l&apos;utiliser. Tirez la
            carte à la souris pour vous déplacer.
          </p>
        ) : selected.type === "folder" ? (
          <FolderPanel root={root} id={selectedId} node={selected} />
        ) : (
          <ToolPanel root={root} id={selectedId} node={selected} translations={translations} />
        )}
      </section>

      <p className={styles.credit}>
        Données : <a href="https://osintframework.com" target="_blank" rel="noopener noreferrer">OSINT Framework</a> (licence MIT, © 2017
        Justin Nordine) — <a href={OSINT_LICENSE_URL} target="_blank" rel="noopener noreferrer">texte de la licence</a>. Les outils
        listés sont des sites tiers : vérifiez leurs conditions d&apos;usage.
      </p>
    </div>
  );
}

function FolderPanel({ root, id, node }: { root: OsintNode; id: string; node: OsintNode }) {
  const names = pathNames(root, id);
  // La description est celle de la grande catégorie (premier niveau) à laquelle appartient celle-ci.
  const topNode = root.children?.[Number(id.split(".")[1])];
  const note = topNode ? CATEGORY_NOTES[topNode.name] : undefined;
  const subfolders = (node.children ?? []).filter((child) => child.type === "folder").length;
  const tools = countTools(node);
  return (
    <div className={styles.detail}>
      <h3 className={styles.title}>{displayName(node.name)}</h3>
      {names.length > 2 && <p className={styles.path}>{names.slice(1, -1).join(" › ")}</p>}
      {note && <p className={styles.text}>{note}</p>}
      <p className={styles.meta}>
        {tools} outil{tools > 1 ? "s" : ""}
        {subfolders > 0 ? ` dans ${subfolders} sous-catégorie${subfolders > 1 ? "s" : ""}` : ""} · cliquez de nouveau pour replier.
      </p>
    </div>
  );
}

function ToolPanel({ root, id, node, translations }: { root: OsintNode; id: string; node: OsintNode; translations: OsintTranslations | null }) {
  const facts = toolFacts(node);
  const href = safeToolUrl(node.url);
  const description = pickText(node, "description", translations);
  const rows = [
    { label: "Idéal pour", value: pickText(node, "bestFor", translations) },
    { label: "Ce qu'on y saisit", value: pickText(node, "input", translations) },
    { label: "Ce qu'on obtient", value: pickText(node, "output", translations) },
    { label: "Discrétion", value: pickText(node, "opsecNote", translations) },
  ].filter((row) => row.value);
  const original = [description, ...rows.map((row) => row.value)].some((value) => value && !value.translated);
  return (
    <div className={styles.detail}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>{displayName(node.name)}</h3>
        {href && (
          <a className={styles.open} href={href} target="_blank" rel="noopener noreferrer">
            Ouvrir l&apos;outil ↗
          </a>
        )}
      </div>
      <p className={styles.path}>{pathNames(root, id).slice(1, -1).join(" › ")}</p>
      {facts.length > 0 && (
        <ul className={styles.facts}>
          {facts.map((fact) => (
            <li key={fact.label} className={`${styles.fact} ${styles[`tone-${fact.tone}`]}`}>
              {fact.label}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.text}>{description?.text ?? "L'OSINT Framework ne fournit pas de description pour cet outil : ouvrez-le pour voir ce qu'il propose."}</p>
      {rows.length > 0 && (
        <dl className={styles.rows}>
          {rows.map((row) => (
            <div key={row.label} className={styles.row}>
              <dt>{row.label}</dt>
              <dd>{row.value?.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {!href && (
        <p className={styles.meta}>
          Cet outil est un extrait de code à placer dans les favoris du navigateur (« bookmarklet ») : il n&apos;a pas d&apos;adresse à ouvrir
          et n&apos;est volontairement pas exécutable depuis Équinoxe.
        </p>
      )}
      {original && <p className={styles.meta}>Texte d&apos;origine en anglais (traduction française à générer).</p>}
    </div>
  );
}
