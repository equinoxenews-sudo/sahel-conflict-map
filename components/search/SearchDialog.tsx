"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import HexFlag from "@/components/investigation/HexFlag";
import { MIN_QUERY_LENGTH, SEARCH_KINDS, type SearchKind, type SearchResponse, type SearchResult } from "@/lib/search";
import { OPEN_SEARCH_EVENT, type OpenSearchDetail } from "@/lib/searchUi";
import { useHasMounted } from "@/lib/useHasMounted";
import styles from "./SearchDialog.module.css";

type Filter = "all" | SearchKind;

const FILTERS: { id: Filter; label: string }[] = [{ id: "all", label: "Tout" }, ...SEARCH_KINDS];

const KIND_TITLES: Record<SearchKind, string> = {
  pays: "Pays",
  actualites: "Actualités",
  analyses: "Analyses",
  entites: "Entités",
};

/** Ce que chaque catégorie permet de retrouver : montré tant que rien n'est tapé. */
const KIND_HINTS: { id: SearchKind; title: string; detail: string }[] = [
  { id: "pays", title: "Pays", detail: "Fiches pays, par nom ou par capitale" },
  { id: "actualites", title: "Actualités", detail: "Synthèses des analystes et articles de presse collectés" },
  { id: "analyses", title: "Analyses", detail: "Points de situation et analyses premium" },
  { id: "entites", title: "Entités", detail: "Organisations, forces et groupes cités dans les fiches pays" },
];

const DEBOUNCE_MS = 250;

function KindIcon({ kind }: { kind: SearchKind }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (kind) {
    case "pays":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
        </svg>
      );
    case "actualites":
      return (
        <svg {...common} aria-hidden>
          <rect x="4" y="4" width="13" height="16" rx="1.5" />
          <path d="M17 8h3v10a2 2 0 0 1-2 2M7.5 8.5h6M7.5 12h6M7.5 15.5h4" />
        </svg>
      );
    case "analyses":
      return (
        <svg {...common} aria-hidden>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v4h4M9 12h6M9 15.5h6M9 9h2" />
        </svg>
      );
    case "entites":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="6" r="2.4" />
          <circle cx="6" cy="18" r="2.4" />
          <circle cx="18" cy="18" r="2.4" />
          <path d="M12 8.4v3.2M12 11.6 6.8 15.8M12 11.6l5.2 4.2" />
        </svg>
      );
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// Fenêtre « Recherche globale » : pays, actualités, analyses et entités, avec filtres par catégorie.
// Ouverte par la barre du haut, la barre du globe, le raccourci « / » (ou Ctrl/Cmd + K).
export default function SearchDialog() {
  const mounted = useHasMounted();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // Dernière réponse reçue, avec la recherche à laquelle elle répond : tant qu'elle diffère de la saisie, on charge.
  const [answer, setAnswer] = useState<{ key: string; results: SearchResult[]; failed: boolean } | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const trimmed = query.replace(/\s+/g, " ").trim();
  const searchable = trimmed.length >= MIN_QUERY_LENGTH;
  const key = `${filter}|${trimmed}`;

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenSearchDetail>).detail ?? {};
      setQuery(detail.query ?? "");
      setFilter(detail.kind ?? "all");
      setActive(0);
      setOpen(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
      if ((event.key === "/" && plain && !isTypingTarget(event.target)) || (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey))) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    // La dernière recherche reste affichée, sélectionnée : une frappe la remplace.
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  useEffect(() => {
    if (!open || !searchable) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (filter !== "all") params.set("type", filter);
        const response = await fetch(`/api/search?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as SearchResponse;
        setAnswer({ key, results: body.results, failed: false });
        setActive(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setAnswer({ key, results: [], failed: true });
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, searchable, trimmed, filter, key]);

  const current = answer?.key === key ? answer : null;
  const loading = searchable && !current;
  const results = useMemo(() => current?.results ?? [], [current]);

  // Verrouille le défilement de la page derrière la fenêtre.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open || !mounted) return null;

  const close = () => setOpen(false);

  const onInputKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.click();
    }
  };

  // Regroupement par catégorie (« Tout »), dans l'ordre des filtres ; chaque ligne garde son rang pour le clavier.
  const groups = SEARCH_KINDS.map((kind) => ({
    kind: kind.id,
    rows: results.map((result, index) => ({ result, index })).filter((row) => row.result.kind === kind.id),
  })).filter((group) => group.rows.length > 0);

  const renderRow = ({ result, index }: { result: SearchResult; index: number }) => {
    const body = (
      <>
        <span className={styles.tile}>{result.iso2 ? <HexFlag iso2={result.iso2} name={result.title} /> : <KindIcon kind={result.kind} />}</span>
        <span className={styles.text}>
          <span className={styles.label}>{result.label}</span>
          <span className={styles.rowTitle}>{result.title}</span>
          {result.detail ? <span className={styles.detail}>{result.detail}</span> : null}
        </span>
        <span className={styles.chevron} aria-hidden>
          {result.external ? "↗" : "›"}
        </span>
      </>
    );
    const className = index === active ? `${styles.row} ${styles.rowActive}` : styles.row;
    return result.external ? (
      <a key={`${result.href}-${index}`} data-index={index} className={className} href={result.href} target="_blank" rel="noopener noreferrer" onClick={close} onMouseMove={() => setActive(index)}>
        {body}
      </a>
    ) : (
      <Link key={`${result.href}-${result.title}-${index}`} data-index={index} className={className} href={result.href} onClick={close} onMouseMove={() => setActive(index)}>
        {body}
      </Link>
    );
  };

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Recherche globale">
      <button type="button" className={styles.backdrop} aria-label="Fermer" onClick={close} />
      <div className={styles.card}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>Recherche globale</h2>
            <p className={styles.subtitle}>Équinoxe Intelligence Search</p>
          </div>
          <button type="button" className={styles.close} aria-label="Fermer la recherche" onClick={close}>
            ✕
          </button>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldIcon} aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKey}
            placeholder="Rechercher un pays, une actualité, une analyse, une entité…"
            aria-label="Rechercher"
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
          />
          {query ? (
            <button
              type="button"
              className={styles.clear}
              aria-label="Effacer la recherche"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className={styles.filters} role="tablist" aria-label="Catégorie">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={filter === item.id ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => {
                setFilter(item.id);
                inputRef.current?.focus();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.body} ref={listRef} aria-live="polite">
          {!searchable ? (
            <>
              <p className={styles.section}>Que peut-on rechercher ?</p>
              <div className={styles.hints}>
                {KIND_HINTS.filter((hint) => filter === "all" || filter === hint.id).map((hint) => (
                  <button
                    key={hint.id}
                    type="button"
                    className={styles.hint}
                    onClick={() => {
                      setFilter(hint.id);
                      inputRef.current?.focus();
                    }}
                  >
                    <span className={styles.tile}>
                      <KindIcon kind={hint.id} />
                    </span>
                    <span className={styles.text}>
                      <span className={styles.rowTitle}>{hint.title}</span>
                      <span className={styles.detail}>{hint.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className={styles.note}>Au moins {MIN_QUERY_LENGTH} caractères. Raccourci : « / » ou Ctrl + K depuis n’importe quelle page.</p>
            </>
          ) : loading ? (
            <p className={styles.status}>Recherche en cours…</p>
          ) : current?.failed ? (
            <p className={styles.status}>La recherche est momentanément indisponible. Réessaie dans un instant.</p>
          ) : results.length === 0 ? (
            <p className={styles.status}>
              Aucun résultat pour « {trimmed} »{filter === "all" ? "" : ` dans ${KIND_TITLES[filter].toLowerCase()}`}.
            </p>
          ) : (
            <>
              <p className={styles.section}>
                {results.length} résultat{results.length > 1 ? "s" : ""}
              </p>
              {filter === "all"
                ? groups.map((group) => (
                    <div key={group.kind} className={styles.group}>
                      <p className={styles.groupTitle}>{KIND_TITLES[group.kind]}</p>
                      {group.rows.map(renderRow)}
                    </div>
                  ))
                : results.map((result, index) => renderRow({ result, index }))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
