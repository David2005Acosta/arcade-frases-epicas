import {
  CATEGORIAS,
  CATEGORIA_META,
  type Categoria,
  type EntradaRanking,
  type Estadisticas,
  type FiltroCategoria,
  type FiltrosArcade,
  type Frase,
} from '../models/frase';

/** Utilidades de presentación (la vista nunca toca SQL). */

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function puntaje(votos: number): string {
  return String(votos).padStart(4, '0');
}

/** Cáscara estática: se pinta una sola vez al arrancar. */
export function renderizarCascara(): string {
  return `
    <div class="fondo-arcade" aria-hidden="true">
      <div class="halo halo-uno"></div>
      <div class="halo halo-dos"></div>
      <div class="suelo"></div>
      <div class="scanlines"></div>
    </div>

    <header class="marquesina">
      <div class="marquesina-interior">
        <a class="logo" href="#" aria-label="Arcade de Frases Épicas, inicio">
          <span class="logo-icono" aria-hidden="true">
            <span class="pixel p1"></span><span class="pixel p2"></span>
            <span class="pixel p3"></span><span class="pixel p4"></span>
          </span>
          <span class="logo-texto">
            <strong>ARCADE DE FRASES</strong>
            <em>ÉPICAS</em>
          </span>
        </a>

        <div class="marquesina-datos">
          <span class="ficha" title="La base de datos SQLite vive en tu navegador">
            <i></i> SQLITE ONLINE
          </span>
          <button type="button" class="btn btn-fantasma btn-mini" id="btn-reiniciar">RESET ARCADE</button>
        </div>
      </div>
      <div class="luces" aria-hidden="true">
        ${Array.from({ length: 24 })
          .map((_, i) => `<span style="--i:${i}"></span>`)
          .join('')}
      </div>
    </header>

    <main class="contenedor">
      <section class="hero">
        <p class="etiqueta-arcade">INSERT COIN · 1 JUGADOR · RANKING EN VIVO</p>
        <h1>Las frases más <em>épicas</em><br />de la historia</h1>
        <p class="entrada">
          Vota las líneas que te marcaron: videojuegos, cine y memes compiten en el mismo
          ranking. Cada voto es un <code>UPDATE</code> en SQLite y mueve la tabla al instante.
        </p>
        <dl class="marcador" id="marcador"></dl>
      </section>

      <div class="tablero">
        <aside class="columna-ranking">
          <section class="panel-ranking" aria-labelledby="titulo-top">
            <header class="panel-cabecera">
              <h2 id="titulo-top">TOP 10</h2>
              <span class="en-vivo"><i></i> LIVE</span>
            </header>
            <p class="panel-sub">Las más votadas de la base de datos</p>
            <ol class="ranking" id="ranking"></ol>
            <p class="panel-pie">Se recalcula con <code>ORDER BY votos DESC</code> en cada voto.</p>
          </section>
        </aside>

        <section class="columna-juego" aria-labelledby="titulo-catalogo">
          <section class="panel-alta">
            <header class="alta-cabecera">
              <div>
                <p class="etiqueta-arcade" id="alta-etiqueta">NUEVA FRASE</p>
                <h2 id="alta-titulo">Sube tu frase al arcade</h2>
              </div>
              <span class="moneda" aria-hidden="true">◉</span>
            </header>

            <form class="formulario" id="form-frase" novalidate>
              <input type="hidden" id="campo-id" value="" />

              <div class="campo campo-ancho">
                <label for="campo-texto">La frase</label>
                <textarea id="campo-texto" name="texto" rows="2" maxlength="200" required
                  placeholder="“Que la Fuerza te acompañe.”"></textarea>
                <span class="contador"><span id="contador-texto">0</span>/200</span>
              </div>

              <div class="fila">
                <div class="campo">
                  <label for="campo-autor">Quién la dice</label>
                  <input id="campo-autor" name="autor" type="text" maxlength="60" required placeholder="Obi-Wan Kenobi" />
                </div>
                <div class="campo">
                  <label for="campo-obra">De dónde es</label>
                  <input id="campo-obra" name="obra" type="text" maxlength="70" required placeholder="Star Wars" />
                </div>
              </div>

              <fieldset class="campo campo-ancho">
                <legend>Categoría</legend>
                <div class="categorias" id="categorias">
                  ${CATEGORIAS.map(
                    (categoria) => `
                    <label class="categoria-opcion" style="--tono:${CATEGORIA_META[categoria].color}">
                      <input type="radio" name="categoria" value="${categoria}" ${categoria === 'videojuego' ? 'checked' : ''} />
                      <span class="categoria-pastilla">
                        <b>${CATEGORIA_META[categoria].icono}</b>${CATEGORIA_META[categoria].etiqueta}
                      </span>
                    </label>`,
                  ).join('')}
                </div>
              </fieldset>

              <div class="alta-acciones">
                <button type="submit" class="btn btn-primario" id="btn-guardar">▶ INSERTAR FRASE</button>
                <button type="button" class="btn btn-fantasma" id="btn-cancelar" hidden>✕ CANCELAR</button>
              </div>
            </form>
          </section>

          <div class="catalogo-cabecera">
            <div>
              <h2 id="titulo-catalogo">Sala de máquinas</h2>
              <p class="catalogo-sub" id="catalogo-sub">Cargando frases…</p>
            </div>
            <button type="button" class="btn btn-fantasma btn-mini" id="btn-limpiar" hidden>LIMPIAR FILTROS</button>
          </div>

          <div class="filtros" id="filtros" role="group" aria-label="Filtrar por categoría"></div>

          <div class="herramientas">
            <label class="buscador">
              <span class="sr-only">Buscar frases</span>
              <span class="lupa" aria-hidden="true">⌕</span>
              <input type="search" id="buscador" placeholder="Buscar frase, autor u obra…" autocomplete="off" />
            </label>
            <label class="selector">
              <span class="sr-only">Ordenar frases</span>
              <select id="orden">
                <option value="ranking">Por votos</option>
                <option value="nuevas">Más nuevas</option>
                <option value="antiguas">Más antiguas</option>
                <option value="alfabetico">A – Z</option>
              </select>
            </label>
          </div>

          <div class="rejilla" id="rejilla" aria-live="polite">
            <div class="vacio"><h3>CARGANDO…</h3><p>Abriendo la base de datos SQLite.</p></div>
          </div>
        </section>
      </div>
    </main>

    <footer class="pie">
      <p>Vite + TypeScript + <strong>SQLite</strong> (sql.js) · tu ranking se guarda en este navegador.</p>
      <p class="pie-meta" id="pie-meta"></p>
    </footer>

    <div class="modal" id="modal-eliminar" hidden>
      <div class="modal-fondo" data-cerrar-modal></div>
      <div class="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <p class="game-over">GAME OVER</p>
        <h2 id="modal-titulo">¿Borrar esta frase?</h2>
        <p id="modal-texto">Se eliminará de la base de datos y perderá todos sus votos.</p>
        <div class="modal-acciones">
          <button type="button" class="btn btn-fantasma" data-cerrar-modal>CONTINUAR</button>
          <button type="button" class="btn btn-peligro" id="btn-confirmar-eliminar">BORRAR</button>
        </div>
      </div>
    </div>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;
}

export function renderizarMarcador(stats: Estadisticas): string {
  const lider = stats.categoriaLider ? CATEGORIA_META[stats.categoriaLider] : null;
  const datos: Array<[string, string]> = [
    [String(stats.total), 'FRASES EN JUEGO'],
    [String(stats.votos), 'VOTOS EMITIDOS'],
    [lider ? lider.etiqueta.toUpperCase() : '—', 'CATEGORÍA LÍDER'],
  ];

  return datos
    .map(
      ([valor, etiqueta]) => `
      <div class="dato">
        <dt>${valor}</dt>
        <dd>${etiqueta}</dd>
      </div>`,
    )
    .join('');
}

export function renderizarRanking(entradas: EntradaRanking[]): string {
  if (entradas.length === 0) {
    return '<li class="ranking-vacio">Sin frases todavía.<br />Sé el primero en insertar una.</li>';
  }

  const maximo = Math.max(...entradas.map((e) => e.votos), 1);

  return entradas
    .map((entrada) => {
      const meta = CATEGORIA_META[entrada.categoria];
      const ancho = Math.max(6, Math.round((entrada.votos / maximo) * 100));
      return `
        <li class="rank" style="--tono:${meta.color}">
          <span class="rank-puesto ${entrada.posicion <= 3 ? 'medalla' : ''}">${String(entrada.posicion).padStart(2, '0')}</span>
          <div class="rank-cuerpo">
            <p class="rank-frase">“${escapar(entrada.texto)}”</p>
            <p class="rank-meta">${escapar(entrada.autor)} · ${escapar(entrada.obra)}</p>
            <div class="barra"><i style="width:${ancho}%"></i></div>
          </div>
          <span class="rank-votos">${puntaje(entrada.votos)}</span>
        </li>`;
    })
    .join('');
}

export function renderizarFiltros(
  conteo: Record<Categoria, number>,
  activo: FiltroCategoria,
  total: number,
): string {
  const opciones: Array<{ valor: FiltroCategoria; etiqueta: string; color: string; icono: string; total: number }> = [
    { valor: 'todas', etiqueta: 'TODO', color: '#f4f7ff', icono: '★', total },
    ...CATEGORIAS.map((categoria) => ({
      valor: categoria as FiltroCategoria,
      etiqueta: CATEGORIA_META[categoria].etiqueta.toUpperCase(),
      color: CATEGORIA_META[categoria].color,
      icono: CATEGORIA_META[categoria].icono,
      total: conteo[categoria],
    })),
  ];

  return opciones
    .map(
      (opcion) => `
      <button type="button" class="chip ${opcion.valor === activo ? 'activo' : ''}"
              data-filtro="${opcion.valor}" style="--tono:${opcion.color}"
              aria-pressed="${opcion.valor === activo}">
        <span class="chip-icono">${opcion.icono}</span>${opcion.etiqueta}
        <b>${opcion.total}</b>
      </button>`,
    )
    .join('');
}

export function renderizarFrases(frases: Frase[]): string {
  if (frases.length === 0) {
    return `
      <div class="vacio">
        <h3>NO HAY REGISTROS</h3>
        <p>Prueba con otra categoría o inserta la primera frase de esta pantalla.</p>
      </div>`;
  }
  return frases.map(renderizarTarjeta).join('');
}

export function renderizarTarjeta(frase: Frase): string {
  const meta = CATEGORIA_META[frase.categoria];
  const puesto = frase.posicion ?? 0;

  return `
    <article class="frase-card" data-id="${frase.id}" style="--tono:${meta.color}; --tono-suave:${meta.colorSuave}">
      <div class="card-cabecera">
        <span class="cat-badge">${meta.icono} ${meta.etiqueta.toUpperCase()}</span>
        ${puesto <= 3 && puesto > 0 ? `<span class="medalla-mini">TOP ${puesto}</span>` : ''}
        <span class="puntos"><b id="votos-${frase.id}">${puntaje(frase.votos)}</b><small>PTS</small></span>
      </div>

      <blockquote class="card-frase">“${escapar(frase.texto)}”</blockquote>

      <div class="card-meta">
        <span class="meta-autor">${escapar(frase.autor)}</span>
        <span class="meta-obra">${escapar(frase.obra)}</span>
      </div>

      <div class="card-acciones">
        <button type="button" class="btn-votar" data-accion="votar" data-id="${frase.id}" aria-label="Votar por esta frase">
          <span class="flecha" aria-hidden="true">▲</span> VOTAR
        </button>
        <button type="button" class="btn-icono" data-accion="editar" data-id="${frase.id}" aria-label="Editar frase" title="Editar">✎</button>
        <button type="button" class="btn-icono btn-icono-peligro" data-accion="eliminar" data-id="${frase.id}" aria-label="Eliminar frase" title="Eliminar">✕</button>
      </div>
    </article>`;
}

export function resumenCatalogo(total: number, filtros: FiltrosArcade, hayDatos: boolean): string {
  if (!hayDatos) return 'La base de datos está vacía. Inserta la primera frase.';
  const categoria = filtros.categoria === 'todas' ? 'todas las categorías' : CATEGORIA_META[filtros.categoria].etiqueta.toLowerCase();
  const busqueda = filtros.busqueda.trim();
  const base = total === 1 ? '1 frase en pantalla' : `${total} frases en pantalla`;
  return busqueda ? `${base} · ${categoria} · “${busqueda}”` : `${base} · ${categoria}`;
}
