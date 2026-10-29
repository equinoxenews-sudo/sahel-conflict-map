import type { MediaAsset } from "./modules";

/**
 * Une image peut paraître en production seulement si sa licence est confirmée (« cleared ») ET autorise expressément la
 * réutilisation commerciale. Aucune photo n'est libre parce qu'elle figure sur Wikimédia, un ministère ou un site d'industriel.
 */
export function allowedInProduction(asset: Pick<MediaAsset, "licenseStatus" | "commercialReuseAllowed"> | null | undefined): boolean {
  return Boolean(asset && asset.licenseStatus === "cleared" && asset.commercialReuseAllowed === true);
}

/**
 * Règle d'affichage d'une image : en production, seulement une image autorisée (voir `allowedInProduction`). En démonstration
 * (preview), les images « à confirmer » ou inconnues s'affichent aussi pour juger la mise en page.
 */
export function displayable(asset: MediaAsset | null | undefined, demoActive: boolean): asset is MediaAsset {
  return Boolean(asset && (allowedInProduction(asset) || demoActive));
}
