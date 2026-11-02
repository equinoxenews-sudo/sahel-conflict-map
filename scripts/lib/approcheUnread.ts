// Observations sans emplacement : ni tuile, ni module (observationKey), ni section d'électricité, ni volet « Autres sources », ni panneau de
// données complémentaires. Le contrôle s'appuie sur le même classement que l'interface (lib/approche/complements.ts) et sur les clés
// réellement lues par les composants (lib/approche/readKeys.ts, généré) : il ne peut pas diverger du code.
import { classifyObservations } from "../../lib/approche/complements";
import { READ_KEYS } from "../../lib/approche/readKeys";
import type { CountryData } from "../../lib/approche/schema";

export interface UnreadKey {
  key: string;
  /** Pourquoi l'observation n'est affichée nulle part (sans libellé, rubrique inconnue…). */
  reason: string;
  /** Clé lue par l'interface qui porte le même nom final (ex. `identity.regime` → `politics.regime`), si elle existe. */
  suggestion: string | null;
}

export function unreadObservationKeys(data: CountryData): UnreadKey[] {
  const placements = classifyObservations(data);
  const unread: UnreadKey[] = [];
  const seen = new Set<string>();
  for (const observation of data.observations) {
    const placement = placements.get(observation.id);
    if (placement?.kind !== "hidden" || seen.has(observation.key)) continue;
    // Volontairement masquée (theme « none ») ou non servie à cause de son statut : pas une anomalie de rangement.
    if (placement.reason.startsWith("masquée volontairement") || placement.reason.startsWith("statut")) continue;
    seen.add(observation.key);
    const leaf = observation.key.split(".").pop();
    const same = READ_KEYS.find((candidate) => !candidate.includes("${") && candidate.split(".").pop() === leaf && candidate !== observation.key);
    unread.push({ key: observation.key, reason: placement.reason, suggestion: same ?? null });
  }
  return unread;
}
