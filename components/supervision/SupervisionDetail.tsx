"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/formatDate";
import { describeZone } from "@/lib/supervision/describe";
import type { Supervision } from "@/lib/supervision/model";
import type { ResultItem, Results } from "@/lib/supervision/results";
import { themeShortLabel } from "@/lib/themes";
import { loadResults, runCollection, sendFeedback, writeReport } from "./api";
import SupervisionBanner, { type Alert } from "./SupervisionBanner";
import SupervisionItemCard, { SOURCE_LABELS } from "./SupervisionItemCard";
import SupervisionReport from "./SupervisionReport";
import styles from "./Supervision.module.css";

const SupervisionMap = dynamic(() => import("./SupervisionMap"), { ssr: false });

type Tab = "overview" | "feed" | "analysis" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Vue générale" },
  { key: "feed", label: "Flux" },
  { key: "analysis", label: "Analyses" },
  { key: "settings", label: "Paramètres" },
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
  const [writing, setWriting] = useState(false);
  const [periodDays, setPeriodDays] = useState(7);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [locatedOnly, setLocatedOnly] = useState(false);
  const [showDropped, setShowDropped] = useState(false);
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

  async function collect(days?: number) {
    setRunning(true);
    try {
      await runCollection(supervision.id, days);
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Collecte impossible.");
    } finally {
      setRunning(false);
    }
  }

  async function writeDaily() {
    setWriting(true);
    setError(null);
    try {
      await writeReport(supervision.id);
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Rédaction impossible.");
    } finally {
      setWriting(false);
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
  const shown = useMemo(
    () => inPeriod.filter((item) => (sourceFilter === "all" || item.sourceKind === sourceFilter) && (!locatedOnly || item.latitude != null)),
    [inPeriod, sourceFilter, locatedOnly],
  );
  const locatedCount = inPeriod.filter((item) => item.latitude != null && item.longitude != null).length;
  const run = results?.lastRun ?? null;
  const report = results?.report ?? null;
  const dropped = results?.dropped ?? [];

  // Alertes de la veille, affichées dans le bandeau : ce qui demande l'attention, jamais caché.
  const alerts: Alert[] = [];
  if (supervision.status !== "active") alerts.push({ text: "La veille n'est pas active : aucune collecte tant qu'elle n'est pas activée." });
  if (run?.status === "error") alerts.push({ text: `La dernière collecte a échoué${run.error ? ` : ${run.error}` : "."}` });
  const curated = (run?.stats as { curated?: { note?: string | null; asked?: number; kept?: number; dropped?: number; placed?: number } } | undefined)?.curated;
  if (curated?.note) alerts.push({ text: `Tri des publications : ${curated.note}` });
  if (report?.content.status === "budget") alerts.push({ text: report.content.message });
  if (run?.status === "ok" && items.length > 0 && items.every((item) => item.publishedAt && now - Date.parse(item.publishedAt) > 48 * 3_600_000)) {
    alerts.push({ text: "Aucune nouvelle publication retenue depuis 48 heures." });
  }

  const sourceFilterSelect = (
    <select className={styles.select} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Source">
      <option value="all">Toutes les sources</option>
      {Object.entries(SOURCE_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
  const periodSelect = (
    <select className={styles.select} value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))} aria-label="Période">
      <option value={1}>24 dernières heures</option>
      <option value={7}>7 derniers jours</option>
      <option value={30}>30 derniers jours</option>
      <option value={90}>3 derniers mois</option>
      <option value={365}>12 derniers mois</option>
    </select>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <button type="button" className={styles.ghost} onClick={onBack}>
          ‹ Mes veilles
        </button>
        <h2 className={styles.cardTitle}>{supervision.name}</h2>
        <span className={`${styles.badge} ${supervision.status === "active" ? styles.badgeActive : styles.badgePaused}`}>{supervision.status === "active" ? "Active" : supervision.status === "paused" ? "Suspendue" : "Brouillon"}</span>
        {supervision.status === "active" ? (
          <>
            <button type="button" className={styles.primary} onClick={() => void collect()} disabled={running}>
              {running ? "Collecte en cours…" : "Lancer la collecte"}
            </button>
            <button type="button" className={styles.ghost} onClick={() => void collect(365)} disabled={running} title="Cherche sur les 12 derniers mois et trie 90 publications par passage : relance pour trier la suite">
              Charger l&apos;historique (1 an)
            </button>
          </>
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

      {tab === "overview" ? (
        <>
          <SupervisionBanner items={inPeriod} alerts={alerts} />
          <div className={styles.dash}>
            <div className={styles.dashLeft}>
              <section className={styles.panel}>
                <h3 className={styles.sectionTitle}>Résumé du jour</h3>
                <span className={styles.note}>Résumé quotidien prévu à {String(supervision.schedule.dailyHour).padStart(2, "0")} h (heure indicative, comme réglé dans les paramètres).</span>
                <SupervisionReport report={report} items={items} compact />
                <div className={styles.actions}>
                  <button type="button" className={styles.button} onClick={() => void writeDaily()} disabled={writing || items.length === 0}>
                    {writing ? "Rédaction en cours…" : "Rédiger la synthèse maintenant"}
                  </button>
                </div>
              </section>
              <section className={styles.panel}>
                <h3 className={styles.sectionTitle}>Carte de la zone</h3>
                <div className={styles.dashMap}>
                  <SupervisionMap zone={supervision.zone} items={inPeriod} />
                </div>
                <p className={styles.meta}>
                  {locatedCount} publication(s) placée(s) sur {inPeriod.length}. Les autres n&apos;ont pas de lieu connu : elles restent dans le flux, jamais devinées. Les événements GDELT sont extraits automatiquement : leur lieu peut être faux.
                </p>
              </section>
            </div>

            <section className={`${styles.panel} ${styles.dashRight}`}>
              <div className={styles.filters}>
                {periodSelect}
                {sourceFilterSelect}
                <label className={styles.note}>
                  <input type="checkbox" checked={locatedOnly} onChange={(event) => setLocatedOnly(event.target.checked)} /> Placées seulement
                </label>
              </div>
              <span className={styles.note}>
                {shown.length} publication{shown.length > 1 ? "s" : ""}
                {results?.hidden ? ` · ${results.hidden} masquée(s) par vos retours` : ""}
                {dropped.length > 0 ? ` · ${dropped.length} écartée(s) par le tri (voir l'onglet Flux)` : ""}
                {run ? ` · dernière collecte ${formatDate(run.startedAt)}` : ""}
              </span>
              <div className={styles.feedScroll}>
                {shown.length === 0 ? <div className={styles.empty}>Aucune publication sur cette période. Lancez la collecte ou élargissez la période.</div> : null}
                {shown.map((item) => (
                  <SupervisionItemCard key={item.id} item={item} onFeedback={(entry, kind) => void give(entry, kind)} />
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}

      {tab === "feed" ? (
        <>
          <div className={styles.filters}>
            {periodSelect}
            {sourceFilterSelect}
            <label className={styles.note}>
              <input type="checkbox" checked={locatedOnly} onChange={(event) => setLocatedOnly(event.target.checked)} /> Placées seulement
            </label>
          </div>
          <div className={styles.feed}>
            {shown.length === 0 ? <div className={styles.empty}>Aucune publication sur cette période. Lancez la collecte ou élargissez la période.</div> : null}
            {shown.map((item) => (
              <SupervisionItemCard key={item.id} item={item} onFeedback={(entry, kind) => void give(entry, kind)} />
            ))}
          </div>
          <div className={styles.section}>
            <button type="button" className={styles.ghost} onClick={() => setShowDropped((current) => !current)}>
              {showDropped ? "▾" : "▸"} Écartées par le tri ({dropped.length}) — pour vérifier qu&apos;il n&apos;est pas trop sévère
            </button>
            {showDropped ? (
              dropped.length === 0 ? (
                <p className={styles.meta}>Rien d&apos;écarté pour l&apos;instant.</p>
              ) : (
                dropped.map((entry) => (
                  <div key={entry.id} className={styles.itemMeta}>
                    <span>
                      <a href={entry.url} target={entry.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
                        {entry.titleFr ?? entry.title}
                      </a>
                    </span>
                    <span>{entry.sourceName ?? ""}</span>
                    <span className={styles.reason}>{entry.note ?? "écartée"}</span>
                  </div>
                ))
              )
            ) : null}
          </div>
        </>
      ) : null}

      {tab === "analysis" ? (
        <div className={styles.feed}>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => void writeDaily()} disabled={writing || items.length === 0}>
              {writing ? "Rédaction en cours…" : "Rédiger la synthèse du jour"}
            </button>
            <span className={styles.note}>Un appel à l&apos;IA (Haiku), environ 0,005 $, compté dans le budget du compte.</span>
          </div>
          <SupervisionReport report={report} items={items} />
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
