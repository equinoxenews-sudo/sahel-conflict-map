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

const MAX_CANVAS_PX = 7000;

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
  const pixelRatio = Math.max(
    0.25,
    Math.min(preferredRatio, MAX_CANVAS_PX / Math.max(width, height)),
  );
  return { minX, minY, width, height, pixelRatio };
}

export interface ExportOptions {
  background: "dark" | "light";
  /** Retire e-mails, téléphones, comptes et lieux : on ne partage que les fiches et leurs liens. */
  maskContacts: boolean;
  /** Ajoute un bandeau (titre du dossier, date) et la légende des traits. */
  caption: boolean;
  title: string;
}

export const MASK_CLASS = "eq-export-mask";

const COLORS = {
  dark: { background: "#070d17", text: "#f1f4f7", muted: "#8f9baa" },
  light: { background: "#ffffff", text: "#10161f", muted: "#55606e" },
};

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const EXPORT_TIMEOUT_MS = 40_000;

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

  if (options.maskContacts) container.classList.add(MASK_CLASS);
  try {
    // Laisse le navigateur recalculer la taille des cartes (coordonnées masquées).
    await nextFrame();
    await nextFrame();

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
    const frame = exportFrame(rects);
    if (!frame) throw new Error("Rien à exporter.");

    const { toPng } = await import("html-to-image");
    const colors = COLORS[options.background];
    const graphUrl = await withTimeout(
      toPng(viewport, {
        // Le graphe n'utilise que des polices système : inutile d'aller chercher et d'intégrer celles du site.
        skipFonts: true,
        width: frame.width,
        height: frame.height,
        pixelRatio: frame.pixelRatio,
        backgroundColor: colors.background,
        // Une image externe inaccessible (protection du site d'origine) ne fait pas échouer l'export.
        imagePlaceholder: TRANSPARENT_PIXEL,
        style: {
          width: `${frame.width}px`,
          height: `${frame.height}px`,
          transform: `translate(${-frame.minX}px, ${-frame.minY}px) scale(1)`,
        },
      }),
      EXPORT_TIMEOUT_MS,
      "L'export prend trop de temps : essaie avec « Masquer les coordonnées », ou sur un graphe moins chargé.",
    );
    const graph = await loadImage(graphUrl);

    const ratio = frame.pixelRatio;
    const headerHeight = options.caption ? Math.round(86 * ratio) : 0;
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
  }
}
