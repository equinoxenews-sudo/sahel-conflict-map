import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Block, Report } from "./report";

// Supervision V1 : dessin du rapport en PDF (A4), côté serveur, sans IA et sans service externe. Polices standard du format PDF
// (Helvetica) : aucune police à télécharger, fichier léger. Elles ne couvrent que l'alphabet latin : tout autre caractère est remplacé
// par « ? » plutôt que de faire échouer l'export (voir pdfText).

const PAGE = { w: 595.28, h: 841.89 };
const M = { left: 48, right: 48, top: 64, bottom: 56 };
const CONTENT_W = PAGE.w - M.left - M.right;

const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.38, 0.42, 0.48);
const RULE = rgb(0.82, 0.85, 0.88);
const HEAD_FILL = rgb(0.93, 0.95, 0.97);
const TONES = { critical: rgb(0.76, 0.18, 0.18), important: rgb(0.82, 0.42, 0.08), info: rgb(0.2, 0.45, 0.7), muted: MUTED } as const;

/** Texte compatible avec la police : espaces et tirets normalisés, lettres accentuées inconnues ramenées à leur lettre, le reste en « ? ». */
export function pdfText(text: string, font: Pick<PDFFont, "getCharacterSet">): string {
  const allowed = new Set(font.getCharacterSet());
  let out = "";
  for (const ch of text.normalize("NFC").replace(/[   ]/g, " ").replace(/[‐‑−]/g, "-").replace(/[​-‏⁠﻿]/g, "")) {
    const code = ch.codePointAt(0)!;
    if (ch === "\n" || ch === "\t") out += " ";
    else if (code < 32 || code === 127) continue;
    else if (allowed.has(code)) out += ch;
    else {
      const base = ch.normalize("NFD").replace(/\p{Diacritic}/gu, "");
      out += base.length > 0 && [...base].every((c) => allowed.has(c.codePointAt(0)!)) ? base : "?";
    }
  }
  return out;
}

/** Coupe un texte en lignes qui tiennent dans `width` ; un mot plus large que la ligne (une adresse) est coupé caractère par caractère. */
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  const fits = (value: string) => font.widthOfTextAtSize(value, size) <= width;
  for (const word of text.split(/ +/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    if (fits(word)) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const ch of word) {
      if (!fits(chunk + ch) && chunk) {
        lines.push(chunk);
        chunk = "";
      }
      chunk += ch;
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(readonly doc: PDFDocument, readonly fonts: Fonts) {
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PAGE.w, PAGE.h]);
    this.y = PAGE.h - M.top;
  }

  ensure(height: number) {
    if (this.y - height < M.bottom) this.newPage();
  }

  text(value: string, opts: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; width?: number; lineGap?: number } = {}): number {
    const font = opts.font ?? this.fonts.regular;
    const size = opts.size ?? 10;
    const x = opts.x ?? M.left;
    const width = opts.width ?? CONTENT_W - (x - M.left);
    const gap = opts.lineGap ?? 3;
    const lines = wrap(pdfText(value, font), font, size, width);
    for (const line of lines) {
      this.ensure(size + gap);
      this.y -= size;
      this.page.drawText(line, { x, y: this.y, size, font, color: opts.color ?? INK });
      this.y -= gap;
    }
    return lines.length;
  }

  height(value: string, size: number, font: PDFFont, width: number, gap = 3): number {
    return wrap(pdfText(value, font), font, size, width).length * (size + gap);
  }

  gap(points: number) {
    this.y -= points;
  }
}

function drawEntry(w: Writer, block: Extract<Block, { type: "entry" }>) {
  const { regular, bold } = w.fonts;
  const refs = block.refs.length > 0 ? ` [${block.refs.join("] [")}]` : "";
  const tagW = block.tag ? bold.widthOfTextAtSize(pdfText(block.tag.text, bold), 7.5) + 10 : 0;
  const titleW = CONTENT_W - tagW;
  const title = block.title.length > 600 ? `${block.title.slice(0, 597)}…` : block.title;
  const need = w.height(title, 10, bold, titleW) + block.lines.reduce((sum, line, i) => sum + w.height(i === block.lines.length - 1 ? line + refs : line, 8.5, regular, CONTENT_W), 0) + 10;
  w.ensure(Math.min(need, PAGE.h - M.top - M.bottom));
  if (block.tag) {
    const tone = TONES[block.tag.tone];
    const label = pdfText(block.tag.text, bold);
    const top = w.y;
    w.page.drawRectangle({ x: M.left, y: top - 11, width: tagW - 4, height: 12, color: tone });
    w.page.drawText(label, { x: M.left + 5, y: top - 8.5, size: 7.5, font: bold, color: rgb(1, 1, 1) });
    w.text(title, { x: M.left + tagW, size: 10, font: bold, width: titleW });
  } else {
    w.text(title, { size: 10, font: bold });
  }
  block.lines.forEach((line, index) => w.text(index === block.lines.length - 1 ? line + refs : line, { size: 8.5, color: MUTED }));
  w.gap(6);
  w.page.drawLine({ start: { x: M.left, y: w.y + 2 }, end: { x: PAGE.w - M.right, y: w.y + 2 }, thickness: 0.4, color: RULE });
  w.gap(6);
}

function drawTable(w: Writer, block: Extract<Block, { type: "table" }>) {
  const { regular, bold } = w.fonts;
  const widths = block.widths.map((fraction) => fraction * CONTENT_W);
  const pad = 5;
  const rowHeight = (cells: string[], font: PDFFont) => Math.max(...cells.map((cell, i) => w.height(cell, 9, font, widths[i] - pad * 2, 2))) + pad * 2 - 2;
  const drawRow = (cells: string[], font: PDFFont, fill?: ReturnType<typeof rgb>) => {
    const h = rowHeight(cells, font);
    w.ensure(h);
    const top = w.y;
    if (fill) w.page.drawRectangle({ x: M.left, y: top - h, width: CONTENT_W, height: h, color: fill });
    let x = M.left;
    cells.forEach((cell, i) => {
      const lines = wrap(pdfText(cell, font), font, 9, widths[i] - pad * 2);
      lines.forEach((line, n) => w.page.drawText(line, { x: x + pad, y: top - pad - 9 - n * 11, size: 9, font, color: INK }));
      x += widths[i];
    });
    w.page.drawLine({ start: { x: M.left, y: top - h }, end: { x: M.left + CONTENT_W, y: top - h }, thickness: 0.4, color: RULE });
    w.y = top - h;
  };
  drawRow(block.head, bold, HEAD_FILL);
  for (const row of block.rows) drawRow(row, regular);
  w.gap(10);
}

function drawBlock(w: Writer, block: Block) {
  switch (block.type) {
    case "paragraph":
      w.text(block.text, { size: 9.5 });
      w.gap(6);
      return;
    case "note":
      w.text(block.text, { size: 8.5, font: w.fonts.italic, color: MUTED });
      w.gap(6);
      return;
    case "bullets":
      for (const item of block.items) {
        w.ensure(14);
        const y = w.y;
        w.text(item, { x: M.left + 12, size: 9.5, width: CONTENT_W - 12 });
        w.page.drawText("•", { x: M.left + 2, y: y - 9.5, size: 9.5, font: w.fonts.bold, color: MUTED });
        w.gap(3);
      }
      w.gap(4);
      return;
    case "table":
      drawTable(w, block);
      return;
    case "entry":
      drawEntry(w, block);
      return;
  }
}

/** Dessine le rapport et renvoie les octets du PDF. */
export async function renderPdf(report: Report, generatedAt: Date): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfTextPlain(`${report.title} — ${report.subtitle}`));
  doc.setAuthor("Équinoxe News");
  doc.setSubject("Rapport de Supervision, sans analyse IA");
  doc.setProducer("Équinoxe News");
  doc.setCreator("Équinoxe News");
  doc.setCreationDate(generatedAt);
  doc.setModificationDate(generatedAt);
  const fonts: Fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold), italic: await doc.embedFont(StandardFonts.HelveticaOblique) };
  const w = new Writer(doc, fonts);

  // Page de titre : nom du produit, titre, tableau du périmètre.
  w.text("ÉQUINOXE NEWS · SUPERVISION", { size: 8.5, font: fonts.bold, color: MUTED });
  w.gap(6);
  w.text(report.title, { size: 22, font: fonts.bold, lineGap: 5 });
  w.text(report.subtitle, { size: 12, color: MUTED });
  w.gap(14);
  drawTable(w, { type: "table", head: ["Périmètre et période", ""], widths: [0.27, 0.73], rows: report.meta.map(([label, value]) => [label, value]) });

  for (const section of report.sections) {
    // Un titre de section ne reste jamais seul en bas de page : on garde de la place pour son introduction et sa première entrée.
    w.ensure(130);
    w.gap(8);
    w.text(section.heading, { size: 14, font: fonts.bold, lineGap: 4 });
    w.page.drawLine({ start: { x: M.left, y: w.y + 1 }, end: { x: PAGE.w - M.right, y: w.y + 1 }, thickness: 1, color: INK });
    w.gap(8);
    for (const block of section.blocks) drawBlock(w, block);
  }

  // Liste des sources : un numéro, le média, le titre, l'adresse complète.
  w.ensure(110);
  w.gap(8);
  w.text("Sources", { size: 14, font: fonts.bold, lineGap: 4 });
  w.page.drawLine({ start: { x: M.left, y: w.y + 1 }, end: { x: PAGE.w - M.right, y: w.y + 1 }, thickness: 1, color: INK });
  w.gap(8);
  if (report.sources.length === 0) w.text("Aucune adresse de source dans ce rapport.", { size: 9.5, color: MUTED });
  for (const source of report.sources) {
    const label = `[${source.n}]`;
    const indent = 26;
    w.ensure(30);
    const top = w.y;
    w.text(`${source.host} — ${source.title.length > 200 ? `${source.title.slice(0, 197)}…` : source.title}`, { x: M.left + indent, size: 8.5, font: fonts.bold, width: CONTENT_W - indent });
    w.page.drawText(label, { x: M.left, y: top - 8.5, size: 8.5, font: fonts.bold, color: MUTED });
    w.text(source.url, { x: M.left + indent, size: 7.5, color: MUTED, width: CONTENT_W - indent });
    w.gap(4);
  }

  // En-têtes et pieds de page, une fois le nombre de pages connu.
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    if (index > 0) page.drawText(pdfText(`${report.title} · ${report.subtitle}`, fonts.regular), { x: M.left, y: PAGE.h - 36, size: 8, font: fonts.regular, color: MUTED });
    page.drawLine({ start: { x: M.left, y: M.bottom - 14 }, end: { x: PAGE.w - M.right, y: M.bottom - 14 }, thickness: 0.4, color: RULE });
    page.drawText(pdfText(report.footerNote, fonts.regular), { x: M.left, y: M.bottom - 28, size: 7.5, font: fonts.regular, color: MUTED });
    const label = `Page ${index + 1} / ${pages.length}`;
    page.drawText(label, { x: PAGE.w - M.right - fonts.regular.widthOfTextAtSize(label, 7.5), y: M.bottom - 28, size: 7.5, font: fonts.regular, color: MUTED });
  });

  return doc.save();
}

/** Métadonnées du document : pas de contrainte de police (texte Unicode), seulement sans caractères de contrôle. */
function pdfTextPlain(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 200);
}
