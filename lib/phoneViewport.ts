// Téléphones : la page est calculée sur 980 px de large, comme le fait un navigateur mobile en
// « Version ordinateur ». Le site y prend exactement la mise en page ordinateur adaptée aux écrans
// en hauteur (période et niveau de risque en tête, couches par icône, menu complet en haut), sans
// que le visiteur ait à cocher quoi que ce soit. Tablettes et ordinateurs ne sont pas concernés.
//
// Exécuté dans le HTML (app/layout.tsx), avant l'affichage. Le zoom par pincement reste possible.
// Pour revenir à la vraie version mobile (barre du bas, menu ☰), supprimer ce script.
export const PHONE_LAYOUT_WIDTH = 980;
const PHONE_MAX_SCREEN_WIDTH = 600;

export const PHONE_VIEWPORT_SCRIPT = `(function(){try{
var small=Math.min(screen.width,screen.height)<${PHONE_MAX_SCREEN_WIDTH};
var coarse=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;
if(!small||!coarse)return;
var meta=document.querySelector('meta[name="viewport"]');
if(!meta){meta=document.createElement("meta");meta.name="viewport";document.head.appendChild(meta);}
meta.setAttribute("content","width=${PHONE_LAYOUT_WIDTH}, viewport-fit=cover");
}catch(e){}})();`;
