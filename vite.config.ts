import { defineConfig } from 'vite';

// Configuración mínima de Vite. El sitio es 100% estático:
// SQLite corre en el navegador con sql.js y persiste en localStorage.
export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
