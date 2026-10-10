// Génère public/cinematic/earth-lights.webp : les lumières des villes seules, en image
// RGBA (transparente ailleurs), à partir de la carte de nuit NASA (public/cinematic/earth-night.jpg).
// Un halo est ajouté pour que les villes restent visibles quand le globe est vu en entier
// (une ville n'y fait qu'une fraction de pixel). Superposée au globe côté nuit seulement
// (Globe3D.tsx : dayAlpha 0, nightAlpha 1).
//   node scripts/gen-night-lights.mjs
import fs from "node:fs";
import sharp from "sharp";

const SOURCE = "public/cinematic/earth-night.jpg";
const OUT = "public/cinematic/earth-lights.webp";

const base = await sharp(SOURCE).raw().toBuffer({ resolveWithObject: true });
const tight = await sharp(SOURCE).blur(1.4).raw().toBuffer({ resolveWithObject: true });
const wide = await sharp(SOURCE).blur(3.4).raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: c } = base.info;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const out = Buffer.alloc(w * h * 4);
for (let i = 0; i < w * h; i++) {
  const core = base.data[i * c] / 255;
  const near = (tight.data[i * c] / 255) * 2.2;
  const halo = (wide.data[i * c] / 255) * 1.7;
  const level = Math.min(1, Math.max(core, near, halo));
  const white = base.data[i * c + 1] / 255; // un cœur de ville plus blanc que ses abords
  out[i * 4] = 255;
  out[i * 4 + 1] = Math.round(185 + 70 * white);
  out[i * 4 + 2] = Math.round(70 + 150 * white);
  out[i * 4 + 3] = Math.round(smooth(0.12, 0.62, level) * 255);
}
await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 80, alphaQuality: 85 }).toFile(OUT);
console.log(`${OUT} : ${(fs.statSync(OUT).size / 1024).toFixed(0)} Ko`);
