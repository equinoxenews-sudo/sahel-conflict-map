"use client";

import dynamic from "next/dynamic";

// Leaflet touche `window` à l'import : rendu côté navigateur uniquement.
const SituationMap = dynamic(() => import("./SituationMap"), { ssr: false });

export default SituationMap;
