import { initDatabase, reiniciarArcade, tamanoBase } from '../db/database';
import {
  FraseModelo,
  esCategoria,
  type Categoria,
  type DatosFrase,
  type FiltroCategoria,
  type FiltrosArcade,
} from '../models/frase';
import * as vista from '../views/arcadeView';

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró el elemento ${selector}`);
  return el;
}

/**
 * Controlador del arcade: conecta formulario, filtros, votos y tarjetas
 * con el modelo. Toda la coordinación entre vista y SQLite pasa por aquí.
 */
export class ArcadeController {
  private filtros: FiltrosArcade = { categoria: 'todas', busqueda: '', orden: 'ranking' };
  private editandoId: number | null = null;
  private aEliminarId: number | null = null;
  private timerBusqueda: number | undefined;
  private timerToast: number | undefined;

  async iniciar(): Promise<void> {
    await initDatabase();
    this.pintarTodo();
    this.conectarEventos();
  }

  /* ---------------------------------------------------------------- pintado */

  private pintarTodo(): void {
    this.pintarMarcador();
    this.pintarRanking();
    this.pintarFiltros();
    this.pintarRejilla();
    this.actualizarPie();
  }

  private pintarMarcador(): void {
    $('#marcador').innerHTML = vista.renderizarMarcador(FraseModelo.estadisticas());
  }

  private pintarRanking(): void {
    $('#ranking').innerHTML = vista.renderizarRanking(FraseModelo.top(10));
  }

  private pintarFiltros(): void {
    const conteo = FraseModelo.conteoPorCategoria();
    const total = FraseModelo.estadisticas().total;
    $('#filtros').innerHTML = vista.renderizarFiltros(conteo, this.filtros.categoria, total);
  }

  private pintarRejilla(): void {
    const frases = FraseModelo.listar(this.filtros);
    $('#rejilla').innerHTML = vista.renderizarFrases(frases);

    const total = FraseModelo.estadisticas().total;
    $('#catalogo-sub').textContent = vista.resumenCatalogo(frases.length, this.filtros, total > 0);

    const hayFiltros = this.filtros.categoria !== 'todas' || this.filtros.busqueda.trim().length > 0;
    ($("#btn-limpiar") as HTMLButtonElement).hidden = !hayFiltros;
  }

  private actualizarPie(): void {
    const stats = FraseModelo.estadisticas();
    $('#pie-meta').textContent = `Base de datos: ${tamanoBase()} KB · ${stats.total} filas en la tabla "frases" · ${stats.votos} votos`;
  }

  /* ---------------------------------------------------------------- eventos */

  private conectarEventos(): void {
    const form = $('#form-frase') as HTMLFormElement;
    form.addEventListener('submit', (evento) => this.alGuardar(evento));

    $('#campo-texto').addEventListener('input', () => this.actualizarContador());
    $('#btn-cancelar').addEventListener('click', () => {
      this.salirDeEdicion();
      this.toast('Edición cancelada');
    });

    $('#filtros').addEventListener('click', (evento) => {
      const boton = (evento.target as HTMLElement).closest<HTMLButtonElement>('[data-filtro]');
      if (!boton) return;
      const valor = boton.dataset.filtro ?? 'todas';
      this.filtros.categoria = valor as FiltroCategoria;
      this.pintarFiltros();
      this.pintarRejilla();
    });

    $('#buscador').addEventListener('input', (evento) => {
      const valor = (evento.target as HTMLInputElement).value;
      window.clearTimeout(this.timerBusqueda);
      this.timerBusqueda = window.setTimeout(() => {
        this.filtros.busqueda = valor;
        this.pintarRejilla();
      }, 180);
    });

    $('#orden').addEventListener('change', (evento) => {
      this.filtros.orden = (evento.target as HTMLSelectElement).value as FiltrosArcade['orden'];
      this.pintarRejilla();
    });

    $('#btn-limpiar').addEventListener('click', () => {
      this.filtros = { categoria: 'todas', busqueda: '', orden: 'ranking' };
      ($("#buscador") as HTMLInputElement).value = '';
      ($("#orden") as HTMLSelectElement).value = 'ranking';
      this.pintarFiltros();
      this.pintarRejilla();
    });

    $('#rejilla').addEventListener('click', (evento) => {
      const boton = (evento.target as HTMLElement).closest<HTMLButtonElement>('[data-accion]');
      if (!boton) return;
      const id = Number(boton.dataset.id);
      if (!Number.isFinite(id)) return;

      switch (boton.dataset.accion) {
        case 'votar':
          this.votar(id, boton);
          break;
        case 'editar':
          this.entrarEnEdicion(id);
          break;
        case 'eliminar':
          this.abrirModalEliminar(id);
          break;
        default:
          break;
      }
    });

    $('#btn-confirmar-eliminar').addEventListener('click', () => this.confirmarEliminar());
    document.querySelectorAll('[data-cerrar-modal]').forEach((el) => {
      el.addEventListener('click', () => this.cerrarModal());
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') this.cerrarModal();
    });

    $('#btn-reiniciar').addEventListener('click', () => {
      const confirmar = window.confirm('Esto borrará tus cambios y restaurará las frases de fábrica. ¿Continuar?');
      if (!confirmar) return;
      reiniciarArcade();
      this.salirDeEdicion();
      this.pintarTodo();
      this.toast('Arcade restaurado');
    });
  }

  /* -------------------------------------------------------------- votación */

  private votar(id: number, boton: HTMLButtonElement): void {
    try {
      const votos = FraseModelo.votar(id);

      const numero = document.querySelector<HTMLElement>(`#votos-${id}`);
      if (numero) {
        numero.textContent = vista.puntaje(votos);
        numero.classList.remove('pulso');
        void numero.offsetWidth;
        numero.classList.add('pulso');
      }

      boton.classList.remove('votado');
      void boton.offsetWidth;
      boton.classList.add('votado');

      this.flotante(boton, '+1');
      this.pintarRanking();
      this.pintarMarcador();
      this.actualizarPie();
    } catch (error) {
      console.error(error);
      this.toast('No se pudo registrar el voto', 'error');
    }
  }

  private flotante(ancla: HTMLElement, texto: string): void {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'flotante';
    etiqueta.textContent = texto;
    ancla.appendChild(etiqueta);
    window.setTimeout(() => etiqueta.remove(), 900);
  }

  /* ------------------------------------------------------------ formulario */

  private alGuardar(evento: Event): void {
    evento.preventDefault();
    const datos = this.validarFormulario();
    if (!datos) return;

    try {
      if (this.editandoId === null) {
        FraseModelo.crear(datos);
        this.toast('Frase insertada. ¡A votar!');
      } else {
        FraseModelo.actualizar(this.editandoId, datos);
        this.toast('Frase actualizada');
      }
      this.salirDeEdicion();
      this.pintarTodo();
    } catch (error) {
      console.error(error);
      this.toast('No se pudo guardar la frase', 'error');
    }
  }

  private validarFormulario(): DatosFrase | null {
    const texto = ($("#campo-texto") as HTMLTextAreaElement).value.trim();
    const autor = ($("#campo-autor") as HTMLInputElement).value.trim();
    const obra = ($("#campo-obra") as HTMLInputElement).value.trim();
    const categoriaRaw = document.querySelector<HTMLInputElement>('input[name="categoria"]:checked')?.value ?? 'videojuego';

    if (texto.length < 5) {
      this.toast('La frase necesita al menos 5 caracteres', 'error');
      ($("#campo-texto") as HTMLTextAreaElement).focus();
      return null;
    }
    if (autor.length < 2) {
      this.toast('Indica quién dice la frase', 'error');
      ($("#campo-autor") as HTMLInputElement).focus();
      return null;
    }
    if (obra.length < 2) {
      this.toast('Indica de qué juego, película o meme viene', 'error');
      ($("#campo-obra") as HTMLInputElement).focus();
      return null;
    }
    if (!esCategoria(categoriaRaw)) {
      this.toast('Elige una categoría válida', 'error');
      return null;
    }

    return { texto, autor, obra, categoria: categoriaRaw as Categoria };
  }

  private entrarEnEdicion(id: number): void {
    const frase = FraseModelo.porId(id);
    if (!frase) {
      this.toast('Esa frase ya no existe', 'error');
      return;
    }

    this.editandoId = id;
    ($("#campo-id") as HTMLInputElement).value = String(id);
    ($("#campo-texto") as HTMLTextAreaElement).value = frase.texto;
    ($("#campo-autor") as HTMLInputElement).value = frase.autor;
    ($("#campo-obra") as HTMLInputElement).value = frase.obra;

    const radio = document.querySelector<HTMLInputElement>(`input[name="categoria"][value="${frase.categoria}"]`);
    if (radio) radio.checked = true;

    $('#alta-etiqueta').textContent = 'EDITANDO';
    $('#alta-titulo').textContent = 'Corrige la frase';
    $('#btn-guardar').textContent = 'GUARDAR CAMBIOS';
    ($("#btn-cancelar") as HTMLButtonElement).hidden = false;
    ($("#form-frase") as HTMLFormElement).classList.add('editando');

    this.actualizarContador();
    window.setTimeout(() => ($("#campo-texto") as HTMLTextAreaElement).focus(), 300);
    this.toast(`Editando “${frase.texto.slice(0, 28)}…”`);
  }

  private salirDeEdicion(): void {
    this.editandoId = null;
    ($("#form-frase") as HTMLFormElement).reset();

    ($("#campo-id") as HTMLInputElement).value = '';
    const primera = document.querySelector<HTMLInputElement>('input[name="categoria"][value="videojuego"]');
    if (primera) primera.checked = true;

    $('#alta-etiqueta').textContent = 'NUEVA FRASE';
    $('#alta-titulo').textContent = 'Sube tu frase al arcade';
    $('#btn-guardar').textContent = 'INSERTAR FRASE';
    ($("#btn-cancelar") as HTMLButtonElement).hidden = true;
    ($("#form-frase") as HTMLFormElement).classList.remove('editando');

    this.actualizarContador();
  }

  private actualizarContador(): void {
    const largo = ($("#campo-texto") as HTMLTextAreaElement).value.length;
    $('#contador-texto').textContent = String(largo);
  }

  /* --------------------------------------------------------------- eliminar */

  private abrirModalEliminar(id: number): void {
    const frase = FraseModelo.porId(id);
    if (!frase) return;

    this.aEliminarId = id;
    $('#modal-texto').textContent = `“${frase.texto}” se borrará de la base de datos junto con sus ${frase.votos} votos.`;
    ($("#modal-eliminar") as HTMLElement).hidden = false;
    document.body.classList.add('con-modal');
    window.setTimeout(() => $('#btn-confirmar-eliminar').focus(), 80);
  }

  private cerrarModal(): void {
    ($("#modal-eliminar") as HTMLElement).hidden = true;
    document.body.classList.remove('con-modal');
    this.aEliminarId = null;
  }

  private confirmarEliminar(): void {
    if (this.aEliminarId === null) return;
    const id = this.aEliminarId;
    const eliminada = FraseModelo.eliminar(id);
    this.cerrarModal();

    if (this.editandoId === id) this.salirDeEdicion();

    this.pintarTodo();
    this.toast(eliminada ? 'Frase eliminada del arcade' : 'No se encontró la frase', eliminada ? 'ok' : 'error');
  }

  /* ------------------------------------------------------------------ toast */

  private toast(mensaje: string, tipo: 'ok' | 'error' = 'ok'): void {
    const el = $('#toast');
    el.textContent = mensaje;
    el.className = `toast visible ${tipo}`;
    window.clearTimeout(this.timerToast);
    this.timerToast = window.setTimeout(() => {
      el.className = 'toast';
    }, 3200);
  }
}
