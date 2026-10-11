// Téléphones : la page est calculée sur 560 px de large au lieu de la largeur de l'écran
// (≈ 390 px), ce qui la rend environ 30 % plus compacte — textes, panneaux et boutons plus
// petits, plus d'informations à l'écran — tout en gardant la vraie mise en page mobile
// (barre du bas, menu ☰, carte LATEST). Tablettes et ordinateurs ne sont pas concernés.
//
// Exécuté dans le HTML (app/layout.tsx), avant l'affichage. Le zoom par pincement reste possible.
export const PHONE_LAYOUT_WIDTH = 560;
const PHONE_MAX_SCREEN_WIDTH = 600;

export const PHONE_VIEWPORT_SCRIPT = `(function(){try{
var small=Math.min(screen.width,screen.height)<${PHONE_MAX_SCREEN_WIDTH};
var coarse=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;
if(!small||!coarse)return;
var meta=document.querySelector('meta[name="viewport"]');
if(!meta){meta=document.createElement("meta");meta.name="viewport";document.head.appendChild(meta);}
meta.setAttribute("content","width=${PHONE_LAYOUT_WIDTH}, viewport-fit=cover");
}catch(e){}})();`;
