import { getZoneHeroImage } from "./zoneHeroImages";
/** Prefer an unused cited-source image; otherwise use a labelled regional
 * illustration. Never borrow a photograph from an unrelated news event. */
export function chooseBriefImage(candidates: string[], used: Set<string>, zone: string): string {
  const uniqueCandidate = candidates.find((url) => !used.has(url));
  const selected = uniqueCandidate ?? getZoneHeroImage(zone) ?? candidates[0];
  if (!selected) throw new Error(`No illustration configured for zone ${zone}`);
  used.add(selected);
  return selected;
}
