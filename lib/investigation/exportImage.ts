// Export du graphe en image PNG. Le cadrage (calcul pur, testé) est séparé du rendu
// (DOM, bibliothèque html-to-image chargée à la demande pour ne pas alourdir la page).

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportFrame {
  /** Angle haut-gauche du cadre, en coordonnées du graphe. */
  minX: number;
  minY: number;
  width: number;
  height: number;
  /** Facteur de netteté : 2 par défaut, réduit pour qu'un grand graphe tienne dans un canevas. */
  pixelRatio: number;
}

/** Plus grand côté, et surface totale, d'un canevas : au-delà, les navigateurs refusent de dessiner. */
const MAX_CANVAS_PX = 9000;
const MAX_CANVAS_AREA = 50_000_000;

/** Netteté de l'image : ×2 écran, ×3 diaporama, ×4 impression. */
export type ExportQuality = 2 | 3 | 4;

/** Cadrage : tout le graphe, tout le graphe au format diapositive 16:9, ou la partie affichée à l'écran. */
export type ExportCrop = "all" | "slide" | "view";

/** Netteté réellement appliquée : celle demandée, réduite pour que le canevas reste dans les limites. */
export function fitPixelRatio(width: number, height: number, preferredRatio: number): number {
  const bySide = MAX_CANVAS_PX / Math.max(width, height);
  const byArea = Math.sqrt(MAX_CANVAS_AREA / Math.max(1, width * height));
  return Math.max(0.25, Math.min(preferredRatio, bySide, byArea));
}

/** Agrandit un cadre, graphe centré, jusqu'au rapport largeur/hauteur voulu. */
export function fitAspect(frame: ExportFrame, aspect = 16 / 9, preferredRatio = 2, extraHeight = 0): ExportFrame {
  let { minX, minY, width, height } = frame;
  // `extraHeight` : bandeau ajouté sous ou sur le graphe, compté dans le rapport de l'image finale.
  if (width / (height + extraHeight) < aspect) {
    const wider = Math.ceil((height + extraHeight) * aspect);
    minX -= (wider - width) / 2;
    width = wider;
  } else {
    const taller = Math.ceil(width / aspect) - extraHeight;
    minY -= (taller - height) / 2;
    height = taller;
  }
  return { minX, minY, width, height, pixelRatio: fitPixelRatio(width, height, preferredRatio) };
}

/** Cadre exact d'une zone du graphe (la partie visible à l'écran), sans marge. */
export function frameOfRect(rect: Rect, preferredRatio = 2): ExportFrame {
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  return { minX: rect.x, minY: rect.y, width, height, pixelRatio: fitPixelRatio(width, height, preferredRatio) };
}

/** Cadre englobant toutes les fiches, avec une marge, et la netteté qui tient dans un canevas. */
export function exportFrame(
  rects: Rect[],
  padding = 60,
  preferredRatio = 2,
): ExportFrame | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((r) => r.x)) - padding;
  const minY = Math.min(...rects.map((r) => r.y)) - padding;
  const maxX = Math.max(...rects.map((r) => r.x + r.width)) + padding;
  const maxY = Math.max(...rects.map((r) => r.y + r.height)) + padding;
  const width = Math.ceil(maxX - minX);
  const height = Math.ceil(maxY - minY);
  return { minX, minY, width, height, pixelRatio: fitPixelRatio(width, height, preferredRatio) };
}

export interface ExportOptions {
  background: "dark" | "light";
  /** Retire e-mails, téléphones, comptes et lieux : on ne partage que les fiches et leurs liens. */
  maskContacts: boolean;
  /** Ajoute un bandeau (titre du dossier, date) et la légende des traits. */
  caption: boolean;
  title: string;
  /** Netteté demandée (réduite automatiquement si l'image serait trop grande). */
  quality?: ExportQuality;
  crop?: ExportCrop;
}

/** Partie du graphe visible à l'écran, en coordonnées du graphe (d'après la translation et l'échelle de la vue). */
export function visibleRect(container: HTMLElement, viewport: HTMLElement): Rect | null {
  const match = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(\s*(-?[\d.]+)\s*\)/.exec(viewport.style.transform);
  if (!match) return null;
  const scale = Number(match[3]);
  // Graphe non affiché (onglet masqué, taille nulle) : pas de partie visible à lire, on exporte tout.
  if (!scale || container.clientWidth === 0 || container.clientHeight === 0) return null;
  return {
    x: -Number(match[1]) / scale,
    y: -Number(match[2]) / scale,
    width: container.clientWidth / scale,
    height: container.clientHeight / scale,
  };
}

export const MASK_CLASS = "eq-export-mask";
/** Posée sur le graphe pendant tout l'export : masque les commandes (boutons de repli…). */
export const EXPORTING_CLASS = "eq-exporting";

const COLORS = {
  dark: { background: "#070d17", text: "#f1f4f7", muted: "#8f9baa" },
  light: { background: "#ffffff", text: "#10161f", muted: "#55606e" },
};

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const EXPORT_TIMEOUT_MS = 40_000;
/** Hauteur du bandeau (titre, date, légende), en pixels avant netteté. */
const CAPTION_HEIGHT = 86;

/** Une opération qui n'aboutit pas ne doit jamais laisser l'écran bloqué sans explication. */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Attend le prochain affichage. Un navigateur suspend requestAnimationFrame quand l'onglet n'est
// pas visible : la temporisation de secours évite que l'export reste bloqué dans ce cas.
const nextFrame = () =>
  new Promise<void>((resolve) => {
    const fallback = window.setTimeout(resolve, 120);
    requestAnimationFrame(() => {
      window.clearTimeout(fallback);
      resolve();
    });
  });

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image de l'export illisible."));
    image.src = url;
  });
}

/** Rend le graphe affiché dans `container` (élément `.react-flow`) en PNG. */
export async function renderGraphPng(
  container: HTMLElement,
  options: ExportOptions,
): Promise<Blob> {
  const viewport = container.querySelector<HTMLElement>(
    ".react-flow__viewport",
  );
  const nodeElements = [
    ...container.querySelectorAll<HTMLElement>(".react-flow__node"),
  ];
  if (!viewport || nodeElements.length === 0)
    throw new Error("Rien à exporter : le graphe est vide.");

  container.classList.add(EXPORTING_CLASS);
  if (options.maskContacts) container.classList.add(MASK_CLASS);
  try {
    // Laisse le navigateur recalculer la taille des cartes (coordonnées masquées).
    await nextFrame();
    await nextFrame();

    // La partie affichée à l'écran est lue avant que le rendu ne touche à la transformation de la vue.
    const shown = options.crop === "view" ? visibleRect(container, viewport) : null;
    const preferred = options.quality ?? 2;

    // Cadre d'après la position et la taille réelles des cartes dans la page.
    const rects = nodeElements.map((element) => {
      const match = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(
        element.style.transform,
      );
      return {
        x: match ? Number(match[1]) : 0,
        y: match ? Number(match[2]) : 0,
        width: element.offsetWidth,
        height: element.offsetHeight,
      };
    });
    const all = exportFrame(rects, 60, preferred);
    if (!all) throw new Error("Rien à exporter.");
    const frame = options.crop === "view" && shown ? frameOfRect(shown, preferred) : options.crop === "slide" ? fitAspect(all, 16 / 9, preferred, options.caption ? CAPTION_HEIGHT : 0) : all;

    const { toPng } = await import("html-to-image");
    const colors = COLORS[options.background];
    const render = (pixelRatio: number) =>
      toPng(viewport, {
        // Le graphe n'utilise que des polices système : inutile d'aller chercher et d'intégrer celles du site.
        skipFonts: true,
        width: frame.width,
        height: frame.height,
        pixelRatio,
        backgroundColor: colors.background,
        // Une image externe inaccessible (protection du site d'origine) ne fait pas échouer l'export.
        imagePlaceholder: TRANSPARENT_PIXEL,
        style: {
          width: `${frame.width}px`,
          height: `${frame.height}px`,
          transform: `translate(${-frame.minX}px, ${-frame.minY}px) scale(1)`,
        },
      });
    let ratio = frame.pixelRatio;
    const timeoutMessage = "L'export prend trop de temps : essaie avec « Masquer les coordonnées », une netteté plus basse, ou un graphe moins chargé.";
    let graph: HTMLImageElement;
    try {
      graph = await loadImage(await withTimeout(render(ratio), EXPORT_TIMEOUT_MS, timeoutMessage));
    } catch (failure) {
      // Un appareil (téléphone surtout) peut refuser une image trop grande : une seconde tentative, deux fois moins nette.
      if (failure instanceof Error && failure.message === timeoutMessage) throw failure;
      ratio = Math.max(0.25, ratio / 2);
      graph = await loadImage(await withTimeout(render(ratio), EXPORT_TIMEOUT_MS, timeoutMessage));
    }

    const headerHeight = options.caption ? Math.round(CAPTION_HEIGHT * ratio) : 0;
    const canvas = document.createElement("canvas");
    canvas.width = graph.width;
    canvas.height = graph.height + headerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Export impossible dans ce navigateur.");

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (options.caption) {
      const pad = 24 * ratio;
      ctx.fillStyle = colors.text;
      ctx.font = `700 ${26 * ratio}px system-ui, sans-serif`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(options.title, pad, 38 * ratio, canvas.width - pad * 2);
      ctx.fillStyle = colors.muted;
      ctx.font = `${14 * ratio}px system-ui, sans-serif`;
      const date = new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
      }).format(new Date());
      ctx.fillText(
        `Équinoxe Investigation — exporté le ${date}${options.maskContacts ? " — coordonnées masquées" : ""}`,
        pad,
        64 * ratio,
      );

      // Légende : trait plein = documenté, pointillé = supposé.
      const legendY = 38 * ratio;
      const textFont = `${13 * ratio}px system-ui, sans-serif`;
      ctx.font = textFont;
      const supposed = "Lien supposé";
      const documented = "Lien documenté";
      const supposedWidth = ctx.measureText(supposed).width;
      const documentedWidth = ctx.measureText(documented).width;
      let x = canvas.width - pad - supposedWidth;
      ctx.fillStyle = colors.muted;
      ctx.fillText(supposed, x, legendY);
      ctx.strokeStyle = "#c89b3c";
      ctx.lineWidth = 2 * ratio;
      ctx.setLineDash([5 * ratio, 4 * ratio]);
      ctx.beginPath();
      ctx.moveTo(x - 38 * ratio, legendY - 5 * ratio);
      ctx.lineTo(x - 8 * ratio, legendY - 5 * ratio);
      ctx.stroke();
      x -= 38 * ratio + 24 * ratio + documentedWidth;
      ctx.setLineDash([]);
      ctx.fillText(documented, x, legendY);
      ctx.beginPath();
      ctx.moveTo(x - 38 * ratio, legendY - 5 * ratio);
      ctx.lineTo(x - 8 * ratio, legendY - 5 * ratio);
      ctx.stroke();
    }

    ctx.drawImage(graph, 0, headerHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Export impossible.")),
        "image/png",
      );
    });
  } finally {
    container.classList.remove(MASK_CLASS);
    container.classList.remove(EXPORTING_CLASS);
  }
}
