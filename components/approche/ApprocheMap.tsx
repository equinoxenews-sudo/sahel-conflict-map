"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { MapModule } from "@/lib/approche/modules";
import type { SourceView } from "@/lib/approche/view";
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
  demo?: boolean;
}

interface ApprocheMapProps {
  map: MapModule;
  /** Sources citées par les objets de la carte (id → source), pour la fiche d'un objet. */
  sources?: Record<string, SourceView>;
  /** Liste cliquable à côté de la carte (opérations, zones…) : un clic sélectionne l'objet correspondant. */
  list?: { title: string; items: MapListItem[] };
  height?: number;
}

// Carte thématique réutilisable pour tous les pays : couches sélectionnables avec légende, fiche détaillée au clic sur un objet,
// zoom, déplacement et réinitialisation. Les couches viennent des données (`MapModule`), jamais du code.
export default function ApprocheMap({ map, sources = {}, list, height = 440 }: ApprocheMapProps) {
  const [active, setActive] = useState<Set<string>>(() => new Set(map.layers.map((layer) => layer.id)));
  const [selected, setSelected] = useState<{ layerId: string; featureId: string } | null>(null);
  const [resetToken, setResetToken] = useState(0);

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

  return (
    <div className={styles.mapWrap}>
      <div className={styles.mapToolbar} role="group" aria-label="Couches de la carte">
        {map.layers.map((layer) => (
          <button key={layer.id} type="button" className={active.has(layer.id) ? `${styles.chip} ${styles.chipOn}` : styles.chip} aria-pressed={active.has(layer.id)} onClick={() => toggle(layer.id)}>
            <i style={{ background: layer.color }} aria-hidden />
            {layer.title}
            <small>{layer.features.length}</small>
          </button>
        ))}
        <button type="button" className={styles.chipGhost} onClick={() => { setSelected(null); setResetToken((value) => value + 1); }}>
          Réinitialiser la vue
        </button>
      </div>

      <div className={list ? styles.mapGridWithList : styles.mapGrid}>
        <div className={styles.mapCanvas} style={{ height }}>
          <LeafletMap layers={visible} view={map.view} selected={selection ? `${selection.layer.id}:${selection.feature.id}` : null} resetToken={resetToken} onSelect={select} />
        </div>

        {list ? (
          <aside className={styles.mapList} aria-label={list.title}>
            <h3>{list.title}</h3>
            <ul>
              {list.items.map((item) => {
                const linked = item.layerId && item.featureId;
                return (
                  <li key={item.id}>
                    <button type="button" disabled={!linked} onClick={() => linked && select(item.layerId as string, item.featureId as string)} className={styles.mapListItem}>
                      <strong>{item.title}</strong>
                      <span>{item.summary}</span>
                      {item.status || item.date ? (
                        <small>
                          {[item.date, item.status].filter(Boolean).join(" · ")}
                        </small>
                      ) : null}
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
            <span className={styles.chipDot} style={{ background: selection.layer.color }} aria-hidden />
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
            <dt>Coordonnées</dt>
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
        <p className={styles.cardNote}>Cliquez sur un point pour ouvrir sa fiche. Les boutons ci-dessus affichent ou masquent chaque couche.</p>
      )}

      <p className={styles.mapCredit}>
        Fond de carte : Esri. {map.layers.filter((layer) => layer.attribution).map((layer) => `${layer.title} : ${layer.attribution}`).join(" · ")}
      </p>
      {map.note ? <p className={styles.cardNote}>{map.note}</p> : null}
    </div>
  );
}
