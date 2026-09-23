"use client";

import { useRef, useState } from "react";
import styles from "./ToolCard.module.css";

export default function OcrTool() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageUrl(URL.createObjectURL(file));
    setText("");
    setStatus("Chargement du moteur OCR...");

    // Loaded dynamically: tesseract.js pulls in its worker/WASM assets at
    // runtime via createWorker(), not at bundle time — keeps it out of the
    // initial page bundle and avoids the Turbopack bundler risk this
    // project has hit before with other WASM-backed libraries.
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(["fra", "eng"], undefined, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setStatus(`Reconnaissance en cours... ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    try {
      const {
        data: { text: recognized },
      } = await worker.recognize(file);
      setText(recognized.trim());
      setStatus(recognized.trim() ? null : "Aucun texte détecté dans cette image.");
    } catch {
      setStatus("Échec de la reconnaissance — image illisible ou format non supporté.");
    } finally {
      await worker.terminate();
    }
  }

  return (
    <div className={styles.card}>
      <span className={styles.title}>OCR — extraction de texte</span>
      <p className={styles.desc}>
        Reconnaissance de texte 100% dans le navigateur (Tesseract.js) — l&apos;image n&apos;est jamais envoyée à un
        tiers.
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
      {text && (
        <>
          <div className={styles.resultBox}>{text}</div>
          <button type="button" className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(text)}>
            Copier le texte
          </button>
        </>
      )}
    </div>
  );
}
