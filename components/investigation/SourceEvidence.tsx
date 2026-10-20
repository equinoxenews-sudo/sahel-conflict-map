"use client";

import { useEffect, useState } from "react";
import { formatFileSize, getFile } from "@/lib/investigation/fileStore";
import type { Source, SourceFile } from "@/lib/investigation/types";
import styles from "./SourceEvidence.module.css";

/** Adresse affichable du document d'une source quand c'est une image (JPG, PNG) ; null sinon. */
function useSourceImage(file: SourceFile | undefined): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);
  const imageId = file && file.mime.startsWith("image/") ? file.id : null;

  useEffect(() => {
    if (!imageId) return;
    let active = true;
    let created: string | null = null;
    void getFile(imageId)
      .then((blob) => {
        if (!blob || !active) return;
        created = URL.createObjectURL(blob);
        setLoaded({ id: imageId, url: created });
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [imageId]);

  return imageId && loaded?.id === imageId ? loaded.url : null;
}

// Une source telle qu'elle apparaît dans une fiche exportée : titre, adresse écrite en toutes lettres (une image
// ne se clique pas), document joint (nom, type, taille ; l'image elle-même quand c'est un JPG ou un PNG), fiabilité.
export default function SourceEvidence({ source }: { source: Source }) {
  const image = useSourceImage(source.file);
  return (
    <div className={styles.ref}>
      <span className={styles.badge}>Source</span>
      <div className={styles.body}>
        <span className={styles.title}>{source.title}</span>
        {source.url ? <span className={styles.url}>{source.url}</span> : null}
        {source.file ? (
          <span className={styles.file}>
            {source.file.mime === "application/pdf" ? "Document PDF" : "Image"} · {source.file.name} · {formatFileSize(source.file.size)}
          </span>
        ) : null}
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={source.file?.name ?? ""} className={styles.thumb} />
        ) : null}
        <span className={styles.meta}>
          Fiabilité {source.reliability}/5{source.publishedAt ? ` · publié le ${source.publishedAt}` : ""}
        </span>
      </div>
    </div>
  );
}
