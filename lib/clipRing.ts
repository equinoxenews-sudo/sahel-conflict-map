// Découpe d'un contour fermé en bandes de longitude (algorithme de Sutherland-Hodgman, une bande à la fois).
// Sert à fendre le très grand polygone de la Russie (153° de longitude) : Cesium le découpe mal en triangles et dessine un
// grand « croissant » en travers du pays. En bandes étroites, chaque morceau est bien dessiné ; les morceaux ont le même code
// pays, donc une seule couleur et un seul panneau. Voir scripts/split-world-polygons.ts.

export type Position = number[];

/** Garde la partie d'un contour (ouvert, sans point de fermeture) située du bon côté d'une ligne de longitude. */
function clipHalfPlane(points: Position[], limit: number, keepGreater: boolean): Position[] {
  const inside = (p: Position) => (keepGreater ? p[0] >= limit : p[0] <= limit);
  const out: Position[] = [];
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const previous = points[(i + points.length - 1) % points.length];
    if (inside(current)) {
      if (!inside(previous)) out.push(crossing(previous, current, limit));
      out.push(current);
    } else if (inside(previous)) {
      out.push(crossing(previous, current, limit));
    }
  }
  return out;
}

/** Point où le segment a→b coupe la ligne de longitude `limit`. */
function crossing(a: Position, b: Position, limit: number): Position {
  const t = (limit - a[0]) / (b[0] - a[0]);
  return [limit, a[1] + t * (b[1] - a[1])];
}

/** Partie d'un contour fermé (premier point = dernier) comprise entre deux longitudes ; `null` s'il n'en reste rien de dessinable. */
export function clipRingToBand(ring: Position[], minLon: number, maxLon: number): Position[] | null {
  const open = ring.slice(0, -1);
  const clipped = clipHalfPlane(clipHalfPlane(open, minLon, true), maxLon, false);
  if (clipped.length < 3) return null;
  return [...clipped, clipped[0]];
}

/** Largeur d'un contour, en degrés de longitude. */
export function longitudeSpan(ring: Position[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const [lon] of ring) {
    if (lon < min) min = lon;
    if (lon > max) max = lon;
  }
  return { min, max };
}

/** Découpe un contour en bandes de longitude de même largeur, au plus `maxBandDegrees` chacune. Un contour assez étroit est rendu tel quel. */
export function splitRingIntoBands(ring: Position[], maxBandDegrees: number): Position[][] {
  const { min, max } = longitudeSpan(ring);
  const bands = Math.ceil((max - min) / maxBandDegrees);
  if (bands <= 1) return [ring];
  const width = (max - min) / bands;
  const pieces: Position[][] = [];
  for (let i = 0; i < bands; i++) {
    const lo = i === 0 ? min : min + i * width;
    const hi = i === bands - 1 ? max : min + (i + 1) * width;
    const piece = clipRingToBand(ring, lo, hi);
    if (piece) pieces.push(piece);
  }
  return pieces;
}
