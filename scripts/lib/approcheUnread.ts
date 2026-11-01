// Observations renseignées mais jamais lues par l'interface : une clé qu'aucun composant ne lit et qu'aucun module ne référence
// (observationKey) n'apparaît nulle part. Le contrôle s'appuie sur les clés réellement lues par les composants (scanUiKeys), pas
// sur une liste écrite à la main : il ne peut pas diverger du code.
import type { CountryData } from "../../lib/approche/schema";
import { scanUiKeys } from "./approcheContract";

const escape = (text: string) => text.replace(/[.*+?^$()|[\]\\]/g, "\\$&");

/** Une clé lue peut contenir `${…}` (famille de clés) ; `geography.area` désigne toute clé `geography.area.<source>`. */
function matcher(key: string): RegExp {
  const body = key.split(/\$\{[^}]*\}/).map(escape).join("[A-Za-z0-9_-]+");
  return new RegExp(key === "geography.area" ? `^${body}(\\..+)?$` : `^${body}$`);
}

function referencedKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) value.forEach((child) => referencedKeys(child, into));
  else if (value && typeof value === "object") {
    for (const [name, child] of Object.entries(value as Record<string, unknown>)) {
      if (name === "observationKey" && typeof child === "string") into.add(child);
      else referencedKeys(child, into);
    }
  }
}

export interface UnreadKey {
  key: string;
  /** Clé lue par l'interface qui porte le même nom final (ex. `identity.regime` → `politics.regime`), si elle existe. */
  suggestion: string | null;
}

export function unreadObservationKeys(data: CountryData, root: string = process.cwd()): UnreadKey[] {
  const read = scanUiKeys(root).map(({ key }) => key);
  const matchers = read.map(matcher);
  const referenced = new Set<string>();
  referencedKeys(data.modules, referenced);
  const unread: UnreadKey[] = [];
  for (const key of [...new Set(data.observations.map((observation) => observation.key))]) {
    if (referenced.has(key) || matchers.some((m) => m.test(key))) continue;
    const leaf = key.split(".").pop();
    const same = read.find((candidate) => !candidate.includes("${") && candidate.split(".").pop() === leaf && candidate !== key);
    unread.push({ key, suggestion: same ?? null });
  }
  return unread;
}
