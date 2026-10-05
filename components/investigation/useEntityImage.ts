"use client";

import { useEffect, useState } from "react";
import { getImageUrl } from "@/lib/investigation/imageStore";

/** Adresse affichable de l'image d'une fiche : l'image importée (IndexedDB)
 * prime sur l'adresse web ; null tant qu'elle se charge ou s'il n'y en a pas. */
export function useEntityImage(imageId?: string, imageUrl?: string): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!imageId) return;
    let active = true;
    void getImageUrl(imageId).then((url) => {
      if (active) setLoaded({ id: imageId, url });
    });
    return () => {
      active = false;
    };
  }, [imageId]);

  if (imageId) return loaded?.id === imageId ? (loaded.url ?? imageUrl ?? null) : null;
  return imageUrl ?? null;
}
