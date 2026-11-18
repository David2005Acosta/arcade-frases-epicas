import { writeFileSync } from 'node:fs';

// Genera el favicon.ico (64x64, BGRA) con una burbuja de diálogo pixelada.
const S = 64;
const SS = 4;

const enRect = (x, y, rx, ry, w, h) => x >= rx && x < rx + w && y >= ry && y < ry + h;

function pixel(x, y) {
  const cx = x / SS;
  const cy = y / SS;

  // fondo redondeado
  const r = 13;
  const dx = Math.max(Math.abs(cx - 32) - (32 - r), 0);
  const dy = Math.max(Math.abs(cy - 32) - (32 - r), 0);
  if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0];

  const t = (cx + cy) / 128;
  let c = [22 - 16 * t, 16 - 12 * t, 51 - 36 * t, 255];

  // burbuja: cuerpo + cola
  const cuerpo = enRect(cx, cy, 14, 16, 36, 24);
  const cola = cy >= 40 && cy < 49 && cx >= 22 && cx < 30 && 30 - cx > cy - 40 - 2;
  const borde =
    (enRect(cx, cy, 14, 16, 36, 24) &&
      !enRect(cx, cy, 16.5, 18.5, 31, 19)) ||
    (cola &&
      !(cy >= 42 && cy < 49 && cx >= 24.5 && cx < 28 && 28 - cx > cy - 42 - 1));

  if (cuerpo || cola) c = [11, 7, 25, 255];
  if (borde) c = [63, 240, 200, 255];

  // comillas
  if (enRect(cx, cy, 21, 22, 7, 12) || enRect(cx, cy, 31, 22, 7, 12)) {
    c = [255, 61, 154, 255];
    if (cy < 26) c = [255, 208, 230, 255];
  }

  // píxeles decorativos
  if (enRect(cx, cy, 48, 12, 4, 4)) c = [255, 194, 51, 255];
  if (enRect(cx, cy, 10, 46, 4, 4)) c = [63, 240, 200, 255];

  return c;
}

const pixels = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y += 1) {
  for (let x = 0; x < S; x += 1) {
    let a = 0;
    let rr = 0;
    let gg = 0;
    let bb = 0;
    for (let sy = 0; sy < SS; sy += 1) {
      for (let sx = 0; sx < SS; sx += 1) {
        const [r, g, b, al] = pixel(x * SS + sx, y * SS + sy);
        const w = al / 255;
        rr += r * w;
        gg += g * w;
        bb += b * w;
        a += al;
      }
    }
    const peso = a / 255 || 1;
    const o = ((S - 1 - y) * S + x) * 4;
    pixels[o] = Math.round(bb / peso);
    pixels[o + 1] = Math.round(gg / peso);
    pixels[o + 2] = Math.round(rr / peso);
    pixels[o + 3] = Math.round(a / (SS * SS));
  }
}

const maskRow = Math.ceil(S / 32) * 4;
const mask = Buffer.alloc(maskRow * S, 0);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const dir = Buffer.alloc(16);
dir[0] = S;
dir[1] = S;
dir.writeUInt16LE(1, 4);
dir.writeUInt16LE(32, 6);
dir.writeUInt32LE(40 + pixels.length + mask.length, 8);
dir.writeUInt32LE(22, 12);

const info = Buffer.alloc(40);
info.writeUInt32LE(40, 0);
info.writeInt32LE(S, 4);
info.writeInt32LE(S * 2, 8);
info.writeUInt16LE(1, 12);
info.writeUInt16LE(32, 14);
info.writeUInt32LE(pixels.length + mask.length, 20);

writeFileSync('public/favicon.ico', Buffer.concat([header, dir, info, pixels, mask]));
console.log('favicon.ico generado');
