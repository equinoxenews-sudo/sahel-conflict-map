"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/formatDate";
import { describeZone } from "@/lib/supervision/describe";
import { themeShortLabel } from "@/lib/themes";
import type { Supervision } from "@/lib/supervision/model";
import type { ResultItem, Results } from "@/lib/supervision/results";
import { loadResults, runCollection, sendFeedback } from "./api";
import styles from "./Supervision.module.css";

const SupervisionMap = dynamic(() => import("./SupervisionMap"), { ssr: false });

type Tab = "overview" | "map" | "feed" | "analysis" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Vue générale" },
  { key: "map", label: "Carte" },
  { key: "feed", label: "Flux" },
  { key: "analysis", label: "Analyses" },
  { key: "settings", label: "Paramètres" },
];

const SOURCE_LABELS: Record<string, string> = { rss: "Presse", telegram: "Telegram", gdelt: "GDELT", zone_brief: "Équinoxe" };

const FEEDBACK: { kind: string; label: string }[] = [
  { kind: "relevant", label: "Pertinent" },
  { kind: "irrelevant", label: "Non pertinent" },
  { kind: "duplicate", label: "Doublon" },
  { kind: "wrong_location", label: "Lieu incorrect" },
];

interface Props {
  supervision: Supervision;
  onBack: () => void;
  onEdit: () => void;
  /** Active la veille (si l'offre le permet) : le parent affiche l'erreur éventuelle. */
  onActivate: () => void;
  busy: boolean;
}

export default function SupervisionDetail({ supervision, onBack, onEdit, onActivate, busy }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [periodDays, setPeriodDays] = useState(7);
  const [sourceFilter, setSourceFilter] = useState("all");
  // Instant pris à l'ouverture (un rendu pur ne lit pas l'horloge).
  const [now] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const body = await loadResults(supervision.id);
      setResults(body.results);
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Résultats indisponibles.");
    }
  }, [supervision.id]);

  useEffect(() => {
    let cancelled = false;
    loadResults(supervision.id)
      .then((body) => {
        if (!cancelled) setResults(body.results);
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Résultats indisponibles.");
      });
    return () => {
      cancelled = true;
    };
  }, [supervision.id]);

  async function collect() {
    setRunning(true);
    try {
      await runCollection(supervision.id);
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Collecte impossible.");
    } finally {
      setRunning(false);
    }
  }

  async function give(item: ResultItem, kind: string) {
    try {
      await sendFeedback(supervision.id, item.id, kind);
      setResults((current) => {
        if (!current) return current;
        const hide = kind === "irrelevant" || kind === "duplicate";
        return {
          ...current,
          hidden: current.hidden + (hide ? 1 : 0),
          items: hide ? current.items.filter((entry) => entry.id !== item.id) : current.items.map((entry) => (entry.id === item.id ? { ...entry, feedback: kind as ResultItem["feedback"] } : entry)),
        };
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Retour non enregistré.");
    }
  }

  const items = useMemo(() => results?.items ?? [], [results]);
  const inPeriod = useMemo(() => items.filter((item) => !item.publishedAt || now - Date.parse(item.publishedAt) <= periodDays * 86_400_000), [items, periodDays, now]);
  const shown = useMemo(() => inPeriod.filter((item) => sourceFilter === "all" || item.sourceKind === sourceFilter), [inPeriod, sourceFilter]);
  const locatedCount = inPeriod.filter((item) => item.latitude != null && item.longitude != null).length;
  const byKind = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of inPeriod) counts.set(item.sourceKind, (counts.get(item.sourceKind) ?? 0) + 1);
    return [...counts.entries()];
  }, [inPeriod]);
  const run = results?.lastRun ?? null;

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <button type="button" className={styles.ghost} onClick={onBack}>
          ‹ Mes veilles
        </button>
        <h2 className={styles.cardTitle}>{supervision.name}</h2>
        <span className={`${styles.badge} ${supervision.status === "active" ? styles.badgeActive : styles.badgePaused}`}>{supervision.status === "active" ? "Active" : supervision.status === "paused" ? "Suspendue" : "Brouillon"}</span>
        {supervision.status === "active" ? (
          <button type="button" className={styles.primary} onClick={() => void collect()} disabled={running}>
            {running ? "Collecte en cours…" : "Lancer la collecte"}
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={onActivate} disabled={busy}>
            Activer la veille
          </button>
        )}
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.tabs} role="tablist">
        {TABS.map((entry) => (
          <button key={entry.key} type="button" role="tab" aria-selected={tab === entry.key} className={tab === entry.key ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab(entry.key)}>
            {entry.label}
          </button>
        ))}
      </div>

      {tab !== "settings" && tab !== "analysis" ? (
        <div className={styles.filters}>
          <select className={styles.select} value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))} aria-label="Période">
            <option value={1}>24 dernières heures</option>
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
          </select>
          {tab === "feed" ? (
            <select className={styles.select} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Source">
              <option value="all">Toutes les sources</option>
              {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}

      {tab === "overview" ? (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{inPeriod.length}</span>
              <span className={styles.statLabel}>publications retenues</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{locatedCount}</span>
              <span className={styles.statLabel}>placées sur la carte</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{inPeriod.length - locatedCount}</span>
              <span className={styles.statLabel}>sans lieu connu (dans le flux)</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{results?.hidden ?? 0}</span>
              <span className={styles.statLabel}>masquées par vos retours</span>
            </div>
          </div>
          <p className={styles.meta}>
            {run
              ? `Dernière collecte : ${formatDate(run.startedAt)} · ${run.status === "ok" ? "réussie" : run.status === "running" ? "en cours" : "en erreur"}${run.error ? ` — ${run.error}` : ""}.`
              : supervision.status === "active"
                ? "Aucune collecte pour l'instant : lancez-la, ou attendez le passage automatique."
                : "La veille n'est pas active : activez-la pour lancer la collecte."}
          </p>
          {byKind.length > 0 ? (
            <p className={styles.meta}>Répartition : {byKind.map(([kind, count]) => `${SOURCE_LABELS[kind] ?? kind} ${count}`).join(" · ")}.</p>
          ) : null}
          <p className={styles.meta}>
            Les publications sont rattachées à la veille par mots-clés et par zone, sans IA. Une publication sans lieu connu apparaît dans le flux mais pas sur la carte : le lieu n&apos;est jamais deviné.
          </p>
        </>
      ) : null}

      {tab === "map" ? (
        <>
          <div className={styles.detailMap}>
            <SupervisionMap zone={supervision.zone} items={inPeriod} />
          </div>
          <p className={styles.meta}>
            {locatedCount} publication(s) placée(s) ; {inPeriod.length - locatedCount} sans lieu connu (voir l&apos;onglet Flux). Couleurs : Équinoxe doré, GDELT orange, presse vert, Telegram bleu. Les événements GDELT sont extraits automatiquement : leur lieu peut être faux.
          </p>
        </>
      ) : null}

      {tab === "feed" ? (
        <div className={styles.feed}>
          {shown.length === 0 ? <div className={styles.empty}>Aucune publication sur cette période. Lancez la collecte ou élargissez la période.</div> : null}
          {shown.map((item) => (
            <article key={item.id} className={styles.item}>
              <h3 className={styles.itemTitle}>
                <a href={item.url} target={item.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
                  {item.title}
                </a>
              </h3>
              <div className={styles.itemMeta}>
                <span>{item.publishedAt ? formatDate(item.publishedAt) : "Date inconnue"}</span>
                <span>{item.sourceName ?? SOURCE_LABELS[item.sourceKind]}</span>
                {item.latitude == null ? <span className={styles.unlocated}>Lieu inconnu</span> : <span>{item.geoPlace ?? "Lieu"} · {item.geoPrecision === "exact" ? "précis" : "approximatif"}</span>}
              </div>
              {item.excerpt ? <p className={styles.excerpt}>{item.excerpt}</p> : null}
              {item.reason ? <span className={styles.reason}>{item.reason}</span> : null}
              <div className={styles.feedbackRow}>
                {FEEDBACK.map((entry) => (
                  <button key={entry.kind} type="button" className={item.feedback === entry.kind ? `${styles.feedbackBtn} ${styles.feedbackOn}` : styles.feedbackBtn} onClick={() => void give(item, entry.kind)}>
                    {entry.label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "analysis" ? (
        <div className={styles.empty}>
          La synthèse quotidienne et le rapport hebdomadaire arrivent dans une prochaine étape. Rien n&apos;est affiché tant qu&apos;aucun n&apos;a été rédigé à partir des publications retenues : le site n&apos;invente pas de synthèse.
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Paramètres de la veille</h3>
          <p className={styles.meta}>Zone : {describeZone(supervision.zone)}</p>
          <p className={styles.meta}>
            Thèmes : {supervision.criteria.themes.map((theme) => themeShortLabel(theme)).join(", ") || "—"} · Entités : {supervision.criteria.entities.join(", ") || "—"} · Mots-clés : {supervision.criteria.keywords.join(", ") || "—"} · Exclusions : {supervision.criteria.exclusions.join(", ") || "—"}
          </p>
          <p className={styles.meta}>
            Sources : {supervision.sources.filter((source) => source.enabled).map((source) => (source.ref ? `${source.type} (${source.ref})` : source.type)).join(", ") || "—"}
          </p>
          {supervision.userRequest ? <p className={styles.meta}>Mémo : {supervision.userRequest}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={onEdit}>
              Modifier
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
