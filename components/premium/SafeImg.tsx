"use client";

import { useState } from "react";
import { sizedImage } from "@/lib/articleBlocks";

// Image d'article : miniature Wikimedia à la bonne largeur, et repli sur l'original si la
// miniature n'existe pas (photo d'origine plus petite que la largeur demandée).
export default function SafeImg({ src, width, alt, className, eager }: { src: string; width: number; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed ? src : sizedImage(src, width)}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
