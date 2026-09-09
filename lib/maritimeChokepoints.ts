/**
 * Maritime chokepoints tracked for vessel snapshots (lib/syncVessels.ts) —
 * chosen for their relevance to the site's conflict zones rather than
 * global coverage: Red Sea (Houthi attacks on shipping), Strait of
 * Hormuz (Iran tensions), Gulf of Guinea (piracy), Taiwan Strait
 * (China-Taiwan tensions), Black Sea (Ukraine grain corridor).
 */
export interface Chokepoint {
  slug: string;
  name: string;
  /** [[southWestLat, southWestLon], [northEastLat, northEastLon]] */
  boundingBox: [[number, number], [number, number]];
}

export const MARITIME_CHOKEPOINTS: Chokepoint[] = [
  { slug: "red-sea", name: "Mer Rouge / Bab-el-Mandeb", boundingBox: [[10, 32], [20, 45]] },
  { slug: "hormuz", name: "Détroit d'Ormuz", boundingBox: [[24, 54], [27, 58]] },
  { slug: "gulf-of-guinea", name: "Golfe de Guinée", boundingBox: [[-5, -10], [8, 10]] },
  { slug: "taiwan-strait", name: "Détroit de Taïwan", boundingBox: [[22, 118], [26, 122]] },
  { slug: "black-sea", name: "Mer Noire", boundingBox: [[41, 27], [47, 42]] },
];
