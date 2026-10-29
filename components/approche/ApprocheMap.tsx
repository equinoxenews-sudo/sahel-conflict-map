"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { iconForKind } from "@/lib/approche/icons";
import type { MapModule } from "@/lib/approche/modules";
import type { SourceView } from "@/lib/approche/view";
import Icon from "./Icon";
import { useFullscreenSupport } from "./useFullscreenSupport";
import styles from "./Approche.module.css";

// Leaflet touche `window` : la carte elle-même n'est jamais rendue côté serveur et ne se charge qu'à l'affichage de la rubrique.
const LeafletMap = dynamic(() => import("./ApprocheLeafletMap"), { ssr: false, loading: () => <div className={styles.mapLoading}>Chargement de la carte…</div> });

export interface MapListItem {
  id: string;
  title: string;
  summary: string;
  status?: string | null;
  date?: string | null;
  layerId?: string | null;
  featureId?: string | null;
}

interface ApprocheMapProps {
  map: MapModule;
  /** Sources citées par les objets de la carte (id → source), pour la fiche d'un objet. */
  sources?: Record<string, SourceView>;
  /** Liste cliquable à côté de la carte (opérations, zones…) : un clic sélectionne l'objet correspondant. */
  list?: { title: string; items: MapListItem[] };
  height?: number;
}

/** Attributions des couches, regroupées : une mention commune à plusieurs couches n'est écrite qu'une fois. */
function attributionNotes(layers: MapModule["layers"]): string {
  const byNote = new Map<string, string[]>();
  for (const layer of layers) {
    if (!layer.attribution) continue;
    byNote.set(layer.attribution, [...(byNote.get(layer.attribution) ?? []), layer.title]);
  }
  return [...byNote].map(([note, titles]) => `${titles.join(", ")} : ${note}`).join(" · ");
}

// Carte thématique réutilisable pour tous les pays : couches sélectionnables avec légende, marqueurs à pictogrammes, fiche détaillée
// au clic, zoom, déplacement, recentrage et plein écran. Les couches viennent des données (`MapModule`), jamais du code.
export default function ApprocheMap({ map, sources = {}, list, height = 460 }: ApprocheMapProps) {
  const [active, setActive] = useState<Set<string>>(() => new Set(map.layers.map((layer) => layer.id)));
  const [selected, setSelected] = useState<{ layerId: string; featureId: string } | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const canFullscreen = useFullscreenSupport();
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const visible = useMemo(() => map.layers.filter((layer) => active.has(layer.id)), [map.layers, active]);
  const selection = useMemo(() => {
    if (!selected) return null;
    const layer = map.layers.find((item) => item.id === selected.layerId);
    const feature = layer?.features.find((item) => item.id === selected.featureId);
    return layer && feature ? { layer, feature } : null;
  }, [selected, map.layers]);

  function toggle(id: string) {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (selected?.layerId === id) setSelected(null);
  }

  function select(layerId: string, featureId: string) {
    setActive((current) => (current.has(layerId) ? current : new Set(current).add(layerId)));
    setSelected({ layerId, featureId });
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frame.current?.requestFullscreen?.();
  }


  return (
    <div className={styles.mapWrap}>
      <div className={styles.mapToolbar} role="group" aria-label="Couches de la carte">
        {map.layers.map((layer) => (
          <button key={layer.id} type="button" className={active.has(layer.id) ? `${styles.chip} ${styles.chipOn}` : styles.chip} aria-pressed={active.has(layer.id)} onClick={() => toggle(layer.id)}>
            <i style={{ background: layer.color }} aria-hidden>
              <Icon name={layer.icon ?? iconForKind(layer.title, "dot")} size={11} />
            </i>
            {layer.title}
            <small>{layer.features.length}</small>
          </button>
        ))}
      </div>

      <div className={list ? styles.mapGridWithList : styles.mapGrid}>
        <div ref={frame} className={fullscreen ? `${styles.mapCanvas} ${styles.mapFull}` : styles.mapCanvas} style={fullscreen ? undefined : { height }}>
          <LeafletMap layers={visible} view={map.view} hub={map.hub} selected={selection ? `${selection.layer.id}:${selection.feature.id}` : null} resetToken={resetToken} onSelect={select} />
          <div className={styles.mapControls}>
            <button type="button" className={styles.mapButton} onClick={() => { setSelected(null); setResetToken((value) => value + 1); }} aria-label="Recentrer la carte" title="Recentrer">
              <Icon name="target" size={16} />
            </button>
            {canFullscreen ? (
              <button type="button" className={styles.mapButton} onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Quitter le plein écran" : "Afficher la carte en plein écran"} title={fullscreen ? "Quitter le plein écran" : "Plein écran"}>
                <Icon name={fullscreen ? "check" : "map"} size={16} />
              </button>
            ) : null}
          </div>
          <div className={styles.mapLegend} aria-label="Légende">
            {visible.map((layer) => (
              <span key={layer.id}>
                <i style={{ background: layer.color }} aria-hidden>
                  <Icon name={layer.icon ?? iconForKind(layer.title, "dot")} size={10} />
                </i>
                {layer.title}
              </span>
            ))}
          </div>
          {fullscreen && selection ? (
            <section className={styles.mapFloat} aria-live="polite">
              <strong>{selection.feature.name}</strong>
              <span>{selection.feature.kind}</span>
              {selection.feature.summary ? <p>{selection.feature.summary}</p> : null}
            </section>
          ) : null}
        </div>

        {list ? (
          <aside className={styles.mapList} aria-label={list.title}>
            <h3>{list.title}</h3>
            <ul>
              {list.items.map((item) => {
                const linked = item.layerId && item.featureId;
                const isSelected = Boolean(linked && selected?.layerId === item.layerId && selected?.featureId === item.featureId);
                return (
                  <li key={item.id}>
                    <button type="button" disabled={!linked} onClick={() => linked && select(item.layerId as string, item.featureId as string)} className={isSelected ? `${styles.mapListItem} ${styles.mapListItemOn}` : styles.mapListItem} aria-pressed={isSelected}>
                      <strong>{item.title}</strong>
                      <span>{item.summary}</span>
                      {item.status || item.date ? <small>{[item.date, item.status].filter(Boolean).join(" · ")}</small> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        ) : null}
      </div>

      {selection ? (
        <section className={styles.mapSelection} aria-live="polite">
          <header>
            <span className={styles.selIcon} style={{ background: selection.layer.color }} aria-hidden>
              <Icon name={selection.layer.icon ?? iconForKind(selection.feature.kind, iconForKind(selection.layer.title, "dot"))} size={15} />
            </span>
            <strong>{selection.feature.name}</strong>
            <span className={styles.mapKind}>{selection.feature.kind}</span>
            {selection.feature.demo ? <span className={styles.demoTag}>démo</span> : null}
            <button type="button" className={styles.drawerClose} onClick={() => setSelected(null)} aria-label="Fermer la fiche">
              ×
            </button>
          </header>
          {selection.feature.summary ? <p>{selection.feature.summary}</p> : null}
          <dl className={styles.drawerFacts}>
            <dt>Couche</dt>
            <dd>{selection.layer.title}</dd>
            {selection.feature.status ? (
              <>
                <dt>Statut</dt>
                <dd>{selection.feature.status}</dd>
              </>
            ) : null}
            <dt>Localisation</dt>
            <dd>
              {selection.feature.lat.toFixed(3)} ; {selection.feature.lon.toFixed(3)}
            </dd>
          </dl>
          {selection.feature.url ? (
            <p>
              <a href={selection.feature.url} target="_blank" rel="noopener noreferrer">
                Page officielle
              </a>
            </p>
          ) : null}
          {selection.feature.sourceIds.length > 0 ? (
            <ul className={styles.drawerSources}>
              {selection.feature.sourceIds.flatMap((id) => (sources[id] ? [sources[id]] : [])).map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                  </a>
                  <span>
                    {source.publisher} · consultée le {source.accessedAt}
                  </span>
                </li>
              ))}
            </ul>
          ) : selection.feature.demo ? null : (
            <p className={styles.missing}>Aucune source renseignée.</p>
          )}
        </section>
      ) : (
        <p className={styles.cardNote}>Cliquez sur un marqueur pour ouvrir sa fiche. Les boutons ci-dessus affichent ou masquent chaque couche.</p>
      )}

      <p className={styles.mapCredit}>
        Fond de carte : Esri. {attributionNotes(map.layers)}
      </p>
      {map.note ? <p className={styles.cardNote}>{map.note}</p> : null}
    </div>
  );
}
