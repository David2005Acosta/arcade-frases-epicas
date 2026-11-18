import './styles/styles.css';
import { ArcadeController } from './controllers/arcadeController';
import { renderizarCascara } from './views/arcadeView';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontró el contenedor #app');
}

app.innerHTML = renderizarCascara();

const controlador = new ArcadeController();

controlador.iniciar().catch((error) => {
  console.error('No se pudo iniciar el arcade:', error);
  const rejilla = document.querySelector<HTMLElement>('#rejilla');
  if (rejilla) {
    rejilla.innerHTML = `
      <div class="vacio">
        <h3>ERROR DE CARGA</h3>
        <p>No se pudo abrir SQLite en este navegador. Recarga la página o usa un navegador moderno.</p>
      </div>`;
  }
});
