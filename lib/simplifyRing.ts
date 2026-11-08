// Allègement d'un contour fermé (algorithme de Douglas-Peucker) jusqu'à un nombre maximal de sommets.
// Sert à garder la Russie en un seul polygone sur le globe : Cesium plante au-delà d'environ 300 sommets sur ce contour,
// voir MAX_SAFE_VERTICES dans components/equinoxe/Globe3D.tsx.

export type Position = number[];

/** Distance (en degrés, plan) d'un point à un segment. */
function distanceToSegment(p: Position, a: Position, b: Position): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Indices conservés pour une tolérance donnée ; les sommets « fixes » ne sont jamais retirés. */
function keptIndices(ring: Position[], tolerance: number, fixed: boolean[]): boolean[] {
  const kept = fixed.slice();
  const anchors = fixed.flatMap((isFixed, index) => (isFixed ? [index] : []));
  for (let k = 0; k + 1 < anchors.length; k++) {
    const stack: [number, number][] = [[anchors[k], anchors[k + 1]]];
    while (stack.length > 0) {
      const [from, to] = stack.pop() as [number, number];
      let worst = -1;
      let worstDistance = tolerance;
      for (let i = from + 1; i < to; i++) {
        const d = distanceToSegment(ring[i], ring[from], ring[to]);
        if (d > worstDistance) {
          worstDistance = d;
          worst = i;
        }
      }
      if (worst !== -1) {
        kept[worst] = true;
        stack.push([from, worst], [worst, to]);
      }
    }
  }
  return kept;
}

/**
 * Allège un contour fermé (premier point = dernier) pour qu'il ait au plus `maxPoints` sommets, avec la plus petite tolérance possible.
 * Les sommets pour lesquels `isFixed` répond vrai (par exemple ceux posés sur la ligne de changement de date) sont toujours gardés.
 * Un contour déjà assez court est rendu tel quel.
 */
export function simplifyRing(ring: Position[], maxPoints: number, isFixed: (p: Position) => boolean = () => false): Position[] {
  if (ring.length <= maxPoints) return ring;
  const last = ring.length - 1;
  const fixed = ring.map((p, i) => i === 0 || i === last || isFixed(p));
  const fixedCount = fixed.filter(Boolean).length;
  if (fixedCount > maxPoints) throw new Error(`Trop de sommets fixes (${fixedCount}) pour un maximum de ${maxPoints}`);

  let low = 0;
  let high = 10; // degrés : bien plus que nécessaire, le contour tiendrait en quelques points
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    if (keptIndices(ring, mid, fixed).filter(Boolean).length <= maxPoints) high = mid;
    else low = mid;
  }
  const kept = keptIndices(ring, high, fixed);
  return ring.filter((_, i) => kept[i]);
}
