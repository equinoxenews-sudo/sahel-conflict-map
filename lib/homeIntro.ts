// Introduction de la page d'accueil : constantes partagées entre le script de démarrage,
// le composant HomeIntro (titre, bouton « Passer », apparition de l'interface) et le
// globe (components/equinoxe/Globe3D.tsx), qui se parlent par évènements du navigateur.

/** Attribut posé sur <html> : « loading » → « playing » → « done » (absent : pas d'introduction). */
export const INTRO_ATTR = "data-home-intro";

/** Une introduction par session de navigation ; ?intro=1 la rejoue, ?intro=0 la désactive. */
export const INTRO_STORAGE_KEY = "equinoxe-home-intro-v1";

export const INTRO_EVENTS = {
  /** Moteur 3D chargé et globe créé : l'écran de chargement passe à l'étape suivante. */
  engine: "equinoxe:globe-engine",
  /** Globe construit et tuiles visibles chargées : le vol peut commencer. */
  ready: "equinoxe:globe-ready",
  /** Lance le vol de la caméra. */
  fly: "equinoxe:intro-fly",
  /** Le vol est terminé (ou passé) : l'accueil se révèle. */
  flightDone: "equinoxe:intro-flight-done",
  /** « Passer l'introduction ». */
  skip: "equinoxe:intro-skip",
} as const;

/** Exécuté dans le HTML (app/layout.tsx), avant l'affichage : décide tout de suite si l'introduction
 * joue, pour que l'interface ne s'affiche pas une fraction de seconde avant d'être masquée.
 * Seulement au chargement de la page d'accueil elle-même. */
export const INTRO_BOOT_SCRIPT = `(function(){try{
if(location.pathname!=="/")return;
var q=new URLSearchParams(location.search);
var mode=q.get("intro");
var seen=sessionStorage.getItem(${JSON.stringify(INTRO_STORAGE_KEY)});
var reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(mode!=="0"&&(mode==="1"||!seen)&&!reduced){document.documentElement.setAttribute(${JSON.stringify(INTRO_ATTR)},"loading");}
}catch(e){}})();`;
