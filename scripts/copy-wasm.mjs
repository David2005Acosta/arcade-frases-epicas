// Copia los binarios WebAssembly de sql.js a /public para que Vite los
// sirva como archivos estáticos (tanto en desarrollo como en producción).
//
// sql.js publica dos builds del mismo binario:
//   sql-wasm.wasm         -> entrada "default" (entornos Node)
//   sql-wasm-browser.wasm -> entrada "browser" (la que usa Vite)
// Copiamos ambas para que funcione sin importar cuál se resuelva.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'node_modules/sql.js/dist');
const destino = resolve(root, 'public');

mkdirSync(destino, { recursive: true });

const wasm = ['sql-wasm.wasm', 'sql-wasm-browser.wasm'].filter((archivo) =>
  readdirSync(dist).includes(archivo),
);
if (wasm.length === 0) {
  throw new Error('No se encontraron archivos .wasm en sql.js/dist');
}

for (const archivo of wasm) {
  copyFileSync(resolve(dist, archivo), resolve(destino, archivo));
  console.log(`[postinstall] ${archivo} -> public/`);
}
