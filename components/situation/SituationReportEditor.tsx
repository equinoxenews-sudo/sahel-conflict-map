"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { PlaceFlag } from "@/lib/placeFlags";
import { parisDay, psitLabel, sortAndNumber, type SituationItem, type SituationReport } from "@/lib/situationReport";
import { THEMES } from "@/lib/themes";
import SituationMap from "./SituationMapLoader";
import SituationReportView from "./SituationReportView";
import styles from "./Admin.module.css";

interface EditItem {
  uid: number;
  theme: SituationItem["theme"];
  date: string;
  text: string;
  place: string;
  lat: string;
  lon: string;
  brief_id: number | null;
}

interface SituationReportEditorProps {
  report: SituationReport;
  zoneName: string;
  /** Images des synthèses sources, pour l'aperçu du rendu public. */
  images?: Record<number, string>;
  /** Drapeaux des pays cités dans les lieux, pour l'aperçu. */
  flags?: Record<string, PlaceFlag>;
}

function toEditItem(item: SituationItem, uid: number): EditItem {
  return {
    uid,
    theme: item.theme,
    date: item.date,
    text: item.text,
    place: item.place ?? "",
    lat: item.lat === null ? "" : String(item.lat),
    lon: item.lon === null ? "" : String(item.lon),
    brief_id: item.brief_id,
  };
}

function parseCoordinate(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

// Un point sur la carte exige les deux coordonnées.
function parsedItem(item: EditItem) {
  const lat = parseCoordinate(item.lat);
  const lon = parseCoordinate(item.lon);
  const located = lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  return {
    uid: item.uid,
    theme: item.theme,
    date: item.date,
    text: item.text,
    place: item.place.trim() === "" ? null : item.place.trim(),
    lat: located ? lat : null,
    lon: located ? lon : null,
    brief_id: item.brief_id,
  };
}

const fullDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

export default function SituationReportEditor({ report: initial, zoneName, images, flags }: SituationReportEditorProps) {
  const router = useRouter();
  const nextUid = useRef(initial.items.length);
  const [status, setStatus] = useState(initial.status);
  const [title, setTitle] = useState(initial.title);
  const [conclusion, setConclusion] = useState(initial.conclusion);
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? "");
  const [items, setItems] = useState<EditItem[]>(() => initial.items.map(toEditItem));
  const [placingUid, setPlacingUid] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const label = psitLabel(initial.period_end);
  const numbered = useMemo(() => sortAndNumber(items.map(parsedItem)), [items]);
  const numberByUid = useMemo(() => new Map(numbered.map((item) => [item.uid, item.n])), [numbered]);
  const points = useMemo(
    () =>
      numbered.flatMap((item) =>
        item.lat !== null && item.lon !== null ? [{ n: item.n, lat: item.lat, lon: item.lon, label: item.place ?? item.text }] : []
      ),
    [numbered]
  );

  function patchItem(uid: number, patch: Partial<EditItem>) {
    setItems((current) => current.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
  }

  function addItem() {
    const uid = nextUid.current++;
    setItems((current) => [
      ...current,
      { uid, theme: null, date: parisDay(new Date()), text: "", place: "", lat: "", lon: "", brief_id: null },
    ]);
  }

  function removeItem(uid: number) {
    setItems((current) => current.filter((item) => item.uid !== uid));
    setPlacingUid((current) => (current === uid ? null : current));
  }

  function placeOnMap(lat: number, lon: number) {
    if (placingUid === null) return;
    patchItem(placingUid, { lat: lat.toFixed(4), lon: lon.toFixed(4) });
  }

  function payload() {
    return {
      title,
      conclusion,
      image_url: imageUrl.trim() === "" ? null : imageUrl.trim(),
      items: numbered.map((item) => ({
        theme: item.theme,
        date: item.date,
        text: item.text,
        place: item.place,
        lat: item.lat,
        lon: item.lon,
        brief_id: item.brief_id,
      })),
    };
  }

  async function call(url: string, init: RequestInit): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, error: data.error };
  }

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setMessage(null);
    try {
      const error = await action();
      if (error) setMessage({ kind: "error", text: error });
    } catch {
      setMessage({ kind: "error", text: "Échec de la requête réseau." });
    } finally {
      setBusy(false);
    }
  }

  const endpoint = `/api/admin/situation/${initial.id}`;

  const save = () =>
    run(async () => {
      const result = await call(endpoint, { method: "PUT", body: JSON.stringify(payload()) });
      if (!result.ok) return result.error ?? "Enregistrement impossible.";
      setMessage({ kind: "ok", text: "Modifications enregistrées." });
      return null;
    });

  const publish = () =>
    run(async () => {
      const saved = await call(endpoint, { method: "PUT", body: JSON.stringify(payload()) });
      if (!saved.ok) return saved.error ?? "Enregistrement impossible.";
      const result = await call(endpoint, { method: "POST", body: JSON.stringify({ action: "publish" }) });
      if (!result.ok) return result.error ?? "Publication impossible.";
      setStatus("published");
      setMessage({ kind: "ok", text: "Publié. Le rapport est visible sur le site." });
      return null;
    });

  const unpublish = () =>
    run(async () => {
      const result = await call(endpoint, { method: "POST", body: JSON.stringify({ action: "unpublish" }) });
      if (!result.ok) return result.error ?? "Opération impossible.";
      setStatus("draft");
      setMessage({ kind: "ok", text: "Le rapport est repassé en brouillon : il n'est plus public." });
      return null;
    });

  const remove = () => {
    if (!window.confirm("Supprimer définitivement ce brouillon ?")) return;
    return run(async () => {
      const result = await call(endpoint, { method: "DELETE" });
      if (!result.ok) return result.error ?? "Suppression impossible.";
      router.push("/admin/situation");
      return null;
    });
  };

  const publicHref = `/zones/${initial.zone_slug}/analyse/point-de-situation/${initial.id}`;

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <div>
          <p className={styles.kicker}>
            {zoneName} · {label.full}
          </p>
          <p className={styles.sub}>
            Période : {fullDate.format(new Date(initial.period_start))} → {fullDate.format(new Date(initial.period_end))}
            {initial.model ? ` · modèle ${initial.model}` : ""}
          </p>
        </div>
        <span className={status === "published" ? `${styles.badge} ${styles.badgeOn}` : styles.badge}>
          {status === "published" ? "Publié" : "Brouillon"}
        </span>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Idée maîtresse (titre)</span>
        <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={400} />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Image majeure (adresse de l&apos;image)</span>
        <input className={styles.input} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        {imageUrl.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl.trim()} alt="" className={styles.thumb} />
        ) : null}
      </label>

      <div className={styles.split}>
        <div className={styles.itemsColumn}>
          <h2 className={styles.sectionTitle}>Événements ({items.length})</h2>
          <p className={styles.hint}>
            Le numéro et le regroupement par thématique se recalculent à l&apos;enregistrement. Pour placer un événement : « Placer sur la carte », puis clique sur la carte.
          </p>
          {items.map((item) => (
            <div key={item.uid} className={item.uid === placingUid ? `${styles.itemCard} ${styles.itemCardActive}` : styles.itemCard}>
              <div className={styles.itemTop}>
                <span className={styles.number}>{numberByUid.get(item.uid) ?? "–"}</span>
                <select
                  className={styles.input}
                  value={item.theme ?? ""}
                  onChange={(e) => patchItem(item.uid, { theme: (e.target.value || null) as EditItem["theme"] })}
                  aria-label="Thématique"
                >
                  <option value="">Sans thématique</option>
                  {THEMES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className={styles.inputDate}
                  value={item.date}
                  onChange={(e) => patchItem(item.uid, { date: e.target.value })}
                  aria-label="Date de l'événement"
                />
              </div>
              <textarea
                className={styles.textarea}
                rows={3}
                value={item.text}
                onChange={(e) => patchItem(item.uid, { text: e.target.value })}
                aria-label="Résumé de l'événement"
              />
              <div className={styles.itemPlace}>
                <input
                  className={styles.input}
                  value={item.place}
                  onChange={(e) => patchItem(item.uid, { place: e.target.value })}
                  placeholder="Lieu (ville, pays)"
                  aria-label="Lieu"
                />
                <input
                  className={styles.inputCoord}
                  value={item.lat}
                  onChange={(e) => patchItem(item.uid, { lat: e.target.value })}
                  placeholder="Latitude"
                  inputMode="decimal"
                  aria-label="Latitude"
                />
                <input
                  className={styles.inputCoord}
                  value={item.lon}
                  onChange={(e) => patchItem(item.uid, { lon: e.target.value })}
                  placeholder="Longitude"
                  inputMode="decimal"
                  aria-label="Longitude"
                />
              </div>
              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={item.uid === placingUid ? styles.primarySmall : styles.secondarySmall}
                  onClick={() => setPlacingUid(item.uid === placingUid ? null : item.uid)}
                >
                  {item.uid === placingUid ? "Cliquer sur la carte…" : "Placer sur la carte"}
                </button>
                <button type="button" className={styles.secondarySmall} onClick={() => patchItem(item.uid, { lat: "", lon: "" })}>
                  Retirer le point
                </button>
                {item.brief_id !== null ? (
                  <Link href={`/briefs/${item.brief_id}`} target="_blank" rel="noopener noreferrer" className={styles.linkSmall}>
                    Synthèse source →
                  </Link>
                ) : null}
                <button type="button" className={styles.dangerSmall} onClick={() => removeItem(item.uid)}>
                  Supprimer l&apos;événement
                </button>
              </div>
            </div>
          ))}
          <button type="button" className={styles.secondary} onClick={addItem}>
            + Ajouter un événement
          </button>
        </div>

        <div className={styles.mapColumn}>
          <div className={styles.mapBox}>
            <SituationMap
              points={points}
              zoneSlug={initial.zone_slug}
              selectedN={placingUid === null ? null : (numberByUid.get(placingUid) ?? null)}
              onSelect={(n) => {
                const target = numbered.find((item) => item.n === n);
                if (target) setPlacingUid(target.uid);
              }}
              onMapClick={placingUid === null ? undefined : placeOnMap}
            />
          </div>
          <p className={styles.hint}>
            {placingUid === null
              ? "Choisis un événement (« Placer sur la carte ») pour le positionner d'un clic."
              : `Événement ${numberByUid.get(placingUid) ?? ""} sélectionné : clique à l'endroit voulu.`}
          </p>
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Conclusion et perspectives (sépare les paragraphes par une ligne vide)</span>
        <textarea className={styles.textarea} rows={8} value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={save} disabled={busy}>
          Enregistrer
        </button>
        {status === "draft" ? (
          <button type="button" className={styles.primary} onClick={publish} disabled={busy}>
            Enregistrer et publier
          </button>
        ) : (
          <>
            <Link href={publicHref} className={styles.secondaryLink} target="_blank" rel="noopener noreferrer">
              Voir sur le site →
            </Link>
            <button type="button" className={styles.secondary} onClick={unpublish} disabled={busy}>
              Repasser en brouillon
            </button>
          </>
        )}
        {status === "draft" ? (
          <button type="button" className={styles.danger} onClick={remove} disabled={busy}>
            Supprimer le brouillon
          </button>
        ) : null}
        <button type="button" className={styles.secondary} onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Masquer l'aperçu" : "Aperçu du rendu public"}
        </button>
      </div>
      {message ? <p className={message.kind === "ok" ? styles.ok : styles.error}>{message.text}</p> : null}

      {showPreview ? (
        <div className={styles.preview}>
          <SituationReportView zoneSlug={initial.zone_slug} title={title} items={numbered} conclusion={conclusion} images={images} flags={flags} openLinksInNewTab />
        </div>
      ) : null}
    </div>
  );
}
