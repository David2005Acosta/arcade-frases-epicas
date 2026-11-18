import { ejecutar, persistir, queryAll, queryOne, ultimoId } from '../db/database';

/** Categorías del arcade. Cada una tiene su propio color de neón. */
export const CATEGORIAS = ['videojuego', 'cine', 'meme'] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export interface CategoriaMeta {
  etiqueta: string;
  singular: string;
  icono: string;
  color: string;
  colorSuave: string;
}

export const CATEGORIA_META: Record<Categoria, CategoriaMeta> = {
  videojuego: {
    etiqueta: 'Videojuegos',
    singular: 'Videojuego',
    icono: '🎮',
    color: '#b46bff',
    colorSuave: 'rgba(180, 107, 255, 0.16)',
  },
  cine: {
    etiqueta: 'Cine',
    singular: 'Cine',
    icono: '🎬',
    color: '#ffc233',
    colorSuave: 'rgba(255, 194, 51, 0.16)',
  },
  meme: {
    etiqueta: 'Memes',
    singular: 'Meme',
    icono: '💾',
    color: '#3ff0c8',
    colorSuave: 'rgba(63, 240, 200, 0.16)',
  },
};

export function esCategoria(valor: string): valor is Categoria {
  return (CATEGORIAS as readonly string[]).includes(valor);
}

/** Fila tal como está guardada en SQLite. */
export interface FraseFila {
  id: number;
  texto: string;
  autor: string;
  obra: string;
  categoria: Categoria;
  votos: number;
  creado_en: string;
  actualizado_en: string | null;
}

/** Frase lista para pintar en pantalla. */
export interface Frase extends FraseFila {
  posicion: number | null;
}

export interface DatosFrase {
  texto: string;
  autor: string;
  obra: string;
  categoria: Categoria;
}

export type FiltroCategoria = 'todas' | Categoria;

export interface FiltrosArcade {
  categoria: FiltroCategoria;
  busqueda: string;
  orden: 'ranking' | 'nuevas' | 'antiguas' | 'alfabetico';
}

export interface Estadisticas {
  total: number;
  votos: number;
  categoriaLider: Categoria | null;
  promedio: number;
}

export interface EntradaRanking {
  id: number;
  texto: string;
  autor: string;
  obra: string;
  categoria: Categoria;
  votos: number;
  posicion: number;
}

const CAMPOS = 'id, texto, autor, obra, categoria, votos, creado_en, actualizado_en';

/**
 * Repositorio del arcade: todo el CRUD, los votos y el ranking viven aquí.
 * Ninguna vista escribe SQL por su cuenta.
 */
export const FraseModelo = {
  listar(filtros: FiltrosArcade): Frase[] {
    const condiciones: string[] = [];
    const params: unknown[] = [];

    if (filtros.categoria !== 'todas') {
      condiciones.push('categoria = ?');
      params.push(filtros.categoria);
    }

    const busqueda = filtros.busqueda.trim();
    if (busqueda) {
      condiciones.push('(texto LIKE ? OR autor LIKE ? OR obra LIKE ?)');
      const patron = `%${busqueda}%`;
      params.push(patron, patron, patron);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const ordenes: Record<FiltrosArcade['orden'], string> = {
      ranking: 'votos DESC, id ASC',
      nuevas: 'id DESC',
      antiguas: 'id ASC',
      alfabetico: 'texto COLLATE NOCASE ASC',
    };

    const filas = queryAll<FraseFila>(
      `SELECT ${CAMPOS} FROM frases ${where} ORDER BY ${ordenes[filtros.orden]}`,
      params,
    );

    // Posición global (sin filtros) para mostrar el puesto en el ranking.
    const ranking = new Map<number, number>();
    queryAll<{ id: number }>('SELECT id FROM frases ORDER BY votos DESC, id ASC').forEach((fila, i) => {
      ranking.set(Number(fila.id), i + 1);
    });

    return filas.map((fila) => ({ ...fila, votos: Number(fila.votos), posicion: ranking.get(Number(fila.id)) ?? null }));
  },

  porId(id: number): Frase | undefined {
    const fila = queryOne<FraseFila>(`SELECT ${CAMPOS} FROM frases WHERE id = ?`, [id]);
    if (!fila) return undefined;
    return { ...fila, votos: Number(fila.votos), posicion: null };
  },

  crear(datos: DatosFrase): Frase {
    const cambios = ejecutar(
      `INSERT INTO frases (texto, autor, obra, categoria, votos)
       VALUES (?, ?, ?, ?, 0)`,
      [datos.texto, datos.autor, datos.obra, datos.categoria],
    );
    if (cambios === 0) throw new Error('No se pudo guardar la frase.');

    persistir();
    const creada = this.porId(ultimoId());
    if (!creada) throw new Error('La frase se guardó pero no se pudo recuperar.');
    return creada;
  },

  actualizar(id: number, datos: DatosFrase): Frase | undefined {
    ejecutar(
      `UPDATE frases
       SET texto = ?, autor = ?, obra = ?, categoria = ?, actualizado_en = datetime('now')
       WHERE id = ?`,
      [datos.texto, datos.autor, datos.obra, datos.categoria, id],
    );
    persistir();
    return this.porId(id);
  },

  eliminar(id: number): boolean {
    const cambios = ejecutar('DELETE FROM frases WHERE id = ?', [id]);
    persistir();
    return cambios > 0;
  },

  /** Voto atómico: UPDATE ... SET votos = votos + 1. */
  votar(id: number, cantidad = 1): number {
    const cambios = ejecutar(
      'UPDATE frases SET votos = MAX(0, votos + ?), actualizado_en = datetime(\'now\') WHERE id = ?',
      [cantidad, id],
    );
    if (cambios === 0) throw new Error('La frase ya no existe.');

    persistir();
    const fila = queryOne<{ votos: number }>('SELECT votos FROM frases WHERE id = ?', [id]);
    return Number(fila?.votos ?? 0);
  },

  /** TOP 10 real: ORDER BY votos DESC + LIMIT. */
  top(cantidad = 10): EntradaRanking[] {
    const filas = queryAll<Omit<EntradaRanking, 'posicion'>>(
      `SELECT ${CAMPOS} FROM frases ORDER BY votos DESC, id ASC LIMIT ?`,
      [cantidad],
    );
    return filas.map((fila, i) => ({ ...fila, votos: Number(fila.votos), posicion: i + 1 }));
  },

  estadisticas(): Estadisticas {
    const base = queryOne<{ total: number; votos: number; promedio: number }>(
      'SELECT COUNT(*) AS total, COALESCE(SUM(votos), 0) AS votos, COALESCE(AVG(votos), 0) AS promedio FROM frases',
    );
    const lider = queryOne<{ categoria: Categoria }>(
      'SELECT categoria FROM frases GROUP BY categoria ORDER BY COUNT(*) DESC, SUM(votos) DESC LIMIT 1',
    );

    return {
      total: Number(base?.total ?? 0),
      votos: Number(base?.votos ?? 0),
      categoriaLider: lider && esCategoria(lider.categoria) ? lider.categoria : null,
      promedio: Math.round(Number(base?.promedio ?? 0)),
    };
  },

  conteoPorCategoria(): Record<Categoria, number> {
    const filas = queryAll<{ categoria: Categoria; total: number }>(
      'SELECT categoria, COUNT(*) AS total FROM frases GROUP BY categoria',
    );
    const conteo = Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<Categoria, number>;
    for (const fila of filas) {
      if (esCategoria(fila.categoria)) conteo[fila.categoria] = Number(fila.total);
    }
    return conteo;
  },
};
