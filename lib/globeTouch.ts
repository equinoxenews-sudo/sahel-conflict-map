/**
 * Toucher du globe sur téléphone.
 *
 * La page fait 980 px de large sur téléphone (voir app/layout.tsx) : le navigateur la réduit pour la faire tenir dans l'écran, si bien
 * qu'un pixel de la page vaut environ 0,4 pixel d'écran. Le moteur du globe ne compte un toucher comme un clic que si le doigt a bougé de
 * moins de 5 px de la page, soit 2 px d'écran : presque aucun toucher réel n'y parvient, et le pays touché ne s'ouvrait pas.
 * La tolérance est donc exprimée en pixels d'écran (ceux du doigt), puis convertie en pixels de la page.
 */

/** Tolérance d'origine du moteur (souris) : inchangée à la souris. */
export const MOUSE_CLICK_TOLERANCE = 5;

/** Déplacement du doigt accepté pour un toucher, en pixels d'écran (ordre de grandeur des seuils d'Android et d'iOS). */
export const TOUCH_TAP_SCREEN_PX = 10;

/** Plafond en pixels de la page : au-delà, un court glissement pour tourner le globe passerait pour un toucher. */
export const TOUCH_TAP_MAX = 40;

export interface TouchViewport {
  /** Largeur et hauteur de la partie visible de la page, en pixels de la page (visualViewport, sinon innerWidth / innerHeight). */
  visibleWidth: number;
  visibleHeight: number;
  /** Dimensions de l'écran en pixels d'écran (screen.width / screen.height). */
  screenWidth: number;
  screenHeight: number;
}

/** Pixels de la page par pixel d'écran (1 sur ordinateur, environ 2,5 sur un téléphone affichant la page de 980 px). Jamais moins de 1. */
export function pagePxPerScreenPx({ visibleWidth, visibleHeight, screenWidth, screenHeight }: TouchViewport): number {
  if (!(visibleWidth > 0) || !(screenWidth > 0) || !(screenHeight > 0)) return 1;
  // iOS donne toujours la largeur de l'écran tenu en hauteur : en paysage, c'est le grand côté qui compte.
  const landscape = visibleHeight > 0 && visibleWidth > visibleHeight;
  const screenSide = landscape ? Math.max(screenWidth, screenHeight) : Math.min(screenWidth, screenHeight);
  return Math.max(1, visibleWidth / screenSide);
}

/** Déplacement accepté entre l'appui et le relâchement pour qu'un toucher compte comme un clic, en pixels de la page. */
export function touchClickTolerance(viewport: TouchViewport): number {
  return Math.min(TOUCH_TAP_MAX, Math.round(TOUCH_TAP_SCREEN_PX * pagePxPerScreenPx(viewport)));
}
