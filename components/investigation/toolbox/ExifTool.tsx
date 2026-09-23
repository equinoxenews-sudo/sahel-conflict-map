"use client";

import { useRef, useState } from "react";
import styles from "./ToolCard.module.css";

interface ExifResult {
  tags: Record<string, unknown>;
  gpsCoords: { latitude: number; longitude: number } | null;
}

function formatTagValue(value: unknown): string {
  if (value instanceof Date) return value.toLocaleString("fr-FR");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

export default function ExifTool() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ExifResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
    setStatus("Lecture des métadonnées...");

    const { parse, gps } = await import("exifr");
    try {
      const [tags, gpsCoords] = await Promise.all([
        parse(file).catch(() => null),
        gps(file).catch(() => null),
      ]);
      setResult({ tags: tags ?? {}, gpsCoords: gpsCoords ?? null });
      setStatus(null);
    } catch {
      setStatus("Impossible de lire les métadonnées de cette image.");
    }
  }

  const tagEntries = result ? Object.entries(result.tags).filter(([, v]) => v !== undefined && v !== null) : [];

  return (
    <div className={styles.card}>
      <span className={styles.title}>Métadonnées EXIF / GPS</span>
      <p className={styles.desc}>
        Lecture 100% dans le navigateur (exifr) — l&apos;image n&apos;est jamais envoyée à un tiers.
      </p>

      <div
        className={dragOver ? `${styles.dropZone} ${styles.dropZoneActive}` : styles.dropZone}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        Déposez une image ici, ou cliquez pour en choisir une
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* next/image can't take a blob: URL without a custom loader — plain img is correct here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {imageUrl && <img src={imageUrl} alt="Aperçu" className={styles.preview} />}
      {status && <span className={styles.status}>{status}</span>}

      {result && (
        <>
          {result.gpsCoords ? (
            <a
              className={styles.gpsLink}
              href={`https://www.openstreetmap.org/?mlat=${result.gpsCoords.latitude}&mlon=${result.gpsCoords.longitude}#map=15/${result.gpsCoords.latitude}/${result.gpsCoords.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              GPS : {result.gpsCoords.latitude.toFixed(5)}, {result.gpsCoords.longitude.toFixed(5)} — voir sur la
              carte
            </a>
          ) : (
            <span className={styles.noData}>Aucune donnée GPS trouvée dans cette image.</span>
          )}

          {tagEntries.length === 0 ? (
            <span className={styles.noData}>Aucune donnée EXIF trouvée dans cette image.</span>
          ) : (
            <table className={styles.metaTable}>
              <tbody>
                {tagEntries.map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{formatTagValue(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
