import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { FRASES_INICIALES } from './seed';

/**
 * Capa de conexión a SQLite.
 *
 * sql.js es SQLite compilado a WebAssembly. Vercel es serverless y su sistema
 * de archivos es de solo lectura, así que la base vive en memoria mientras la
 * página está abierta y se exporta a localStorage después de cada escritura.
 * Al recargar se vuelve a hidratar desde ahí: los votos no se pierden.
 */

const STORAGE_KEY = 'arcade-frases.sqlite.v1';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const ESQUEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS frases (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    texto          TEXT    NOT NULL,
    autor          TEXT    NOT NULL,
    obra           TEXT    NOT NULL,
    categoria      TEXT    NOT NULL CHECK (categoria IN ('videojuego','cine','meme')),
    votos          INTEGER NOT NULL DEFAULT 0 CHECK (votos >= 0),
    creado_en      TEXT    NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_frases_categoria ON frases (categoria);
  CREATE INDEX IF NOT EXISTS idx_frases_votos     ON frases (votos DESC);
`;

/** Abre (o crea) la base de datos y devuelve la instancia activa. */
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  SQL = await initSqlJs({
    // En producción el .wasm se sirve desde la raíz del sitio (public/).
    locateFile: (archivo) => `${import.meta.env.BASE_URL}${archivo}`,
  });

  const guardada = localStorage.getItem(STORAGE_KEY);

  if (guardada) {
    try {
      db = new SQL.Database(decodeBase64(guardada));
    } catch (error) {
      console.warn('La base guardada estaba corrupta, se crea una nueva.', error);
      localStorage.removeItem(STORAGE_KEY);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.run(ESQUEMA);

  // Primera visita: sembramos el arcade para que el ranking no esté vacío.
  const [{ total }] = queryAll<{ total: number }>('SELECT COUNT(*) AS total FROM frases');
  if (total === 0) {
    sembrarArcade();
    persistir();
  }

  return db;
}

function sembrarArcade(): void {
  for (const frase of FRASES_INICIALES) {
    ejecutar(
      `INSERT INTO frases (texto, autor, obra, categoria, votos)
       VALUES (?, ?, ?, ?, ?)`,
      [frase.texto, frase.autor, frase.obra, frase.categoria, frase.votos],
    );
  }
}

/** SELECT que devuelve filas tipadas como objetos planos. */
export function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  if (!db) throw new Error('La base de datos no está inicializada.');
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as never);
    const filas: T[] = [];
    while (stmt.step()) {
      filas.push(stmt.getAsObject() as T);
    }
    return filas;
  } finally {
    stmt.free();
  }
}

/** SELECT de una sola fila. */
export function queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
  return queryAll<T>(sql, params)[0];
}

/** INSERT / UPDATE / DELETE. Devuelve cuántas filas cambiaron. */
export function ejecutar(sql: string, params: unknown[] = []): number {
  if (!db) throw new Error('La base de datos no está inicializada.');
  db.run(sql, params as never);
  return db.getRowsModified();
}

/** Id del último INSERT (AUTOINCREMENT). */
export function ultimoId(): number {
  const fila = queryOne<{ id: number }>('SELECT last_insert_rowid() AS id');
  return fila ? Number(fila.id) : 0;
}

/** Exporta la base completa a localStorage: así sobrevive a recargas. */
export function persistir(): void {
  if (!db) return;
  try {
    localStorage.setItem(STORAGE_KEY, encodeBase64(db.export()));
  } catch (error) {
    console.error('No se pudo guardar la base de datos en localStorage.', error);
  }
}

/** Vacía el arcade y vuelve a sembrar las frases de fábrica. */
export function reiniciarArcade(): void {
  ejecutar('DELETE FROM frases');
  ejecutar("DELETE FROM sqlite_sequence WHERE name = 'frases'");
  sembrarArcade();
  persistir();
}

/** Tamaño de la base en KB, para el marcador del pie. */
export function tamanoBase(): number {
  if (!db) return 0;
  return Math.round((db.export().length / 1024) * 10) / 10;
}

function encodeBase64(bytes: Uint8Array): string {
  let binario = '';
  const trozo = 0x8000;
  for (let i = 0; i < bytes.length; i += trozo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + trozo));
  }
  return btoa(binario);
}

function decodeBase64(texto: string): Uint8Array {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}
