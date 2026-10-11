// Adresses du moteur de globe (Cesium) et du fournisseur de tuiles. Partagées entre le globe
// (components/equinoxe/Globe3D.tsx) et la page d'accueil, qui demande au navigateur de commencer
// le téléchargement dès la réception du HTML (app/page.tsx) au lieu d'attendre le chargement
// du reste du site.
export const CESIUM_VERSION = "1.145.0";
export const CESIUM_BASE_URL = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/`;
export const CESIUM_SCRIPT_URL = `${CESIUM_BASE_URL}Cesium.js`;
export const CESIUM_STYLE_URL = `${CESIUM_BASE_URL}Widgets/widgets.css`;
export const CESIUM_CDN_ORIGIN = "https://cdn.jsdelivr.net";
export const TILES_ORIGIN = "https://server.arcgisonline.com";
