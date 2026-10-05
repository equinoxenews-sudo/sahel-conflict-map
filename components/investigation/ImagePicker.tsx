"use client";

import { useRef, useState } from "react";
import { ImageFileError, prepareImage, putImage } from "@/lib/investigation/imageStore";
import { useEntityImage } from "./useEntityImage";
import styles from "./ImagePicker.module.css";

export interface PickedImage {
  imageId?: string;
  imageUrl?: string;
}

interface ImagePickerProps {
  value: PickedImage;
  onChange: (next: PickedImage) => void;
  /** Appelé pour chaque image importée : le formulaire peut ainsi nettoyer celles qu'il n'enregistre pas. */
  onCreated?: (imageId: string) => void;
}

function asWebAddress(text: string): string | null {
  try {
    const url = new URL(text.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// Trois façons d'ajouter une image : choisir un fichier, le glisser-déposer
// (ou glisser une image depuis une page web), la coller (Ctrl+V), ou saisir son
// adresse. Un fichier est réduit et stocké localement ; une adresse reste une
// simple référence (le site d'origine peut la retirer ou la bloquer).
export default function ImagePicker({ value, onChange, onCreated }: ImagePickerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState("");
  const preview = useEntityImage(value.imageId, value.imageUrl);

  async function importFile(file: Blob) {
    setBusy(true);
    setError(null);
    try {
      const imageId = await putImage(await prepareImage(file));
      onCreated?.(imageId);
      onChange({ imageId, imageUrl: undefined });
    } catch (err) {
      setError(err instanceof ImageFileError ? err.message : "Impossible d'importer cette image.");
    } finally {
      setBusy(false);
    }
  }

  function applyAddress(text: string): boolean {
    const url = asWebAddress(text);
    if (!url) {
      setError("Adresse invalide : elle doit commencer par http:// ou https://.");
      return false;
    }
    setError(null);
    onChange({ imageId: undefined, imageUrl: url });
    setAddressDraft("");
    return true;
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) return void importFile(file);
    // Image glissée depuis une page web : on récupère son adresse.
    const dropped = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain");
    if (dropped) applyAddress(dropped.split("\n")[0]);
  }

  function handlePaste(event: React.ClipboardEvent) {
    const file = [...event.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (file) {
      event.preventDefault();
      void importFile(file);
    }
  }

  const hasImage = Boolean(value.imageId || value.imageUrl);

  return (
    <div className={styles.picker} onPaste={handlePaste}>
      <div
        className={dragging ? `${styles.drop} ${styles.dropActive}` : styles.drop}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className={styles.preview}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className={styles.previewImage} referrerPolicy="no-referrer" />
          ) : (
            <span className={styles.previewEmpty}>{busy ? "…" : "Image"}</span>
          )}
        </div>
        <div className={styles.dropText}>
          <span>Glisse une image ici, colle-la (Ctrl+V)</span>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={() => fileInput.current?.click()} disabled={busy}>
              Choisir un fichier
            </button>
            {hasImage ? (
              <button
                type="button"
                className={styles.buttonDanger}
                onClick={() => onChange({ imageId: undefined, imageUrl: undefined })}
              >
                Retirer l&apos;image
              </button>
            ) : null}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importFile(file);
          }}
        />
      </div>

      <div className={styles.address}>
        <input
          className={styles.input}
          value={addressDraft}
          onChange={(event) => setAddressDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (addressDraft.trim()) applyAddress(addressDraft);
            }
          }}
          placeholder="…ou l'adresse d'une image (https://…)"
          aria-label="Adresse d'une image"
        />
        <button
          type="button"
          className={styles.button}
          disabled={!addressDraft.trim()}
          onClick={() => applyAddress(addressDraft)}
        >
          Utiliser
        </button>
      </div>
      {value.imageUrl && !value.imageId ? (
        <p className={styles.note}>Image référencée par adresse : si le site la retire, elle disparaîtra de la fiche.</p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
