// Génère les lumières des villes en images RGBA (transparentes ailleurs), à partir de la
// carte de nuit NASA (public/cinematic/earth-night.jpg) :
//  - earth-lights.webp       : avec un halo, pour que les villes restent visibles quand le
//                              globe est vu en entier (une ville n'y fait qu'une fraction de pixel) ;
//  - earth-lights-core.webp  : cœur des villes seul, net, pour les vues rapprochées.
// Superposées au globe côté nuit seulement (Globe3D.tsx : dayAlpha 0, nightAlpha variable).
//   node scripts/gen-night-lights.mjs
import fs from "node:fs";
import sharp from "sharp";

const SOURCE = "public/cinematic/earth-night.jpg";

const base = await sharp(SOURCE).raw().toBuffer({ resolveWithObject: true });
const tight = await sharp(SOURCE).blur(1.4).raw().toBuffer({ resolveWithObject: true });
const wide = await sharp(SOURCE).blur(3.4).raw().toBuffer({ resolveWithObject: true });
const soft = await sharp(SOURCE).blur(0.6).raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: c } = base.info;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function render(levelAt, from, to) {
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const white = base.data[i * c + 1] / 255; // un cœur de ville plus blanc que ses abords
    out[i * 4] = 255;
    out[i * 4 + 1] = Math.round(185 + 70 * white);
    out[i * 4 + 2] = Math.round(70 + 150 * white);
    out[i * 4 + 3] = Math.round(smooth(from, to, levelAt(i)) * 255);
  }
  return out;
}

const halo = render(
  (i) => Math.min(1, Math.max(base.data[i * c] / 255, (tight.data[i * c] / 255) * 2.2, (wide.data[i * c] / 255) * 1.7)),
  0.12,
  0.62,
);
const core = render((i) => Math.max(base.data[i * c] / 255, (soft.data[i * c] / 255) * 1.1), 0.28, 0.85);

for (const [name, data] of [
  ["public/cinematic/earth-lights.webp", halo],
  ["public/cinematic/earth-lights-core.webp", core],
]) {
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 80, alphaQuality: 85 }).toFile(name);
  console.log(`${name} : ${(fs.statSync(name).size / 1024).toFixed(0)} Ko`);
}
