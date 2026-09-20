"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export const HOME_BODY_ID = "home-body";

// Purely an imperative DOM correction: the page itself is server-rendered
// (and ISR-cached) always as the "accueil" tab so reading the URL's ?tab=
// here — which requires a Suspense boundary and only resolves client-side —
// never forces the page's data-fetching off its cache. Flips the already
// server-rendered #home-body's data-tab attribute to match the real URL.
export default function HomeTabSync() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  useEffect(() => {
    const valid = tab === "actualites" || tab === "zones" ? tab : "accueil";
    document.getElementById(HOME_BODY_ID)?.setAttribute("data-tab", valid);
  }, [tab]);

  return null;
}
