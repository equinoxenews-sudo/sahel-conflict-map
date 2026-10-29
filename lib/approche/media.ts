import type { MediaAsset } from "./modules";

/**
 * Règle d'affichage d'une image : seule une image à licence confirmée (« cleared ») s'affiche en production. En démonstration
 * (preview), les images « à confirmer » s'affichent aussi pour juger la mise en page ; une image « unknown » seulement en démonstration.
 */
export function displayable(asset: MediaAsset | null | undefined, demoActive: boolean): asset is MediaAsset {
  return Boolean(asset && (asset.licenseStatus === "cleared" || demoActive));
}
