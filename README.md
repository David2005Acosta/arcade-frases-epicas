# 🕹️ Arcade de Frases Épicas

> Un salón recreativo donde las frases de **videojuegos, cine y memes** compiten por el
> **MEJORES 10**. Cada voto es un `UPDATE` real en SQLite y el ranking se recalcula al instante.

Aplicación web hecha con **Vite + TypeScript + SQLite**, sin backend y lista para Vercel.
La base de datos se ejecuta en el navegador con **sql.js** (SQLite compilado a WebAssembly)
y se persiste automáticamente en `localStorage`, así que los votos sobreviven a las recargas
y al cierre de la pestaña.

---

## ¿Qué hace?

Votar frases épicas debería ser un deporte. Aquí puedes insertar tus propias frases, votar
las de los demás y ver cómo el ranking se reordena en vivo. Todo se guarda en una tabla
SQLite llamada `frases`.

### Funcionalidades

- **Crear** una frase indicando texto, autor, obra y categoría.
- **Leer** todas las frases con su puntaje y su posición global en el ranking.
- **Actualizar** cualquier frase (texto, autor, obra o categoría).
- **Eliminar** con un modal de confirmación.
- **Votar (+1)**: `UPDATE frases SET votos = votos + 1` y la lista de los mejores 10 se refresca al instante.
- **MEJORES 10** calculado con `ORDER BY votos DESC LIMIT 10`, con barras proporcionales.
- **Filtrar** por categoría (Videojuegos / Cine / Memes).
- **Buscar** por frase, autor u obra.
- **Ordenar** por votos, más nuevas, más antiguas o alfabéticamente.
- **Marcador global**: frases en juego, votos emitidos y categoría líder.
- **Persistencia** en `localStorage` en cada escritura.
- **Diseño responsive** con neón, scanlines, rejilla en perspectiva y animaciones.

---

## 🗄️ Cómo se usa SQLite

El esquema está en `src/db/database.ts`:

```sql
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
```

Operaciones que se ejecutan de verdad sobre SQLite:

| Acción            | SQL                                                        |
| ----------------- | ---------------------------------------------------------- |
| Crear frase       | `INSERT INTO frases (...) VALUES (?, ?, ?, ?, 0)`          |
| Listar / buscar   | `SELECT ... WHERE texto LIKE ? ORDER BY votos DESC`         |
| Votar             | `UPDATE frases SET votos = votos + 1 WHERE id = ?`          |
| Editar            | `UPDATE frases SET texto = ?, autor = ?, ... WHERE id = ?`  |
| Eliminar          | `DELETE FROM frases WHERE id = ?`                            |
| Mejores 10        | `SELECT ... ORDER BY votos DESC, id ASC LIMIT 10`            |
| Estadísticas      | `COUNT`, `SUM`, `AVG`, `GROUP BY categoria`                  |

> **¿Por qué no better-sqlite3?** Vercel es serverless y su filesystem es de solo lectura,
> así que una base nativa no podría escribir en producción. Con `sql.js` la SQLite completa
> corre en el cliente y el navegador actúa como almacenamiento persistente.

---

## 🚀 Ejecutarlo en local

Requisitos: Node.js 18 o superior.

```bash
# 1. Instalar dependencias (el postinstall copia sql-wasm.wasm a /public)
npm install

# 2. Servidor de desarrollo
npm run dev
# → http://localhost:5173

# 3. Build de producción
npm run build

# 4. Previsualizar el build
npm run preview
```

---

## ▲ Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel: **Add New → Project → Import Git Repository**.
3. Framework preset: **Vite** (build `npm run build`, output `dist`). No hacen falta
   variables de entorno ni una base de datos externa.
4. Deploy. Cada `push` a `main` vuelve a desplegar automáticamente.

---

## 🧱 Tecnologías

| Tecnología      | Uso                                                 |
| --------------- | --------------------------------------------------- |
| Vite 7          | Bundler y servidor de desarrollo                    |
| TypeScript 5.9  | Tipado estricto en todo el proyecto                 |
| SQLite (sql.js) | Base de datos relacional en el navegador (WASM)     |
| localStorage    | Persistencia de la base entre sesiones              |
| CSS moderno     | Neón, scanlines, rejilla en perspectiva y animaciones |
| SVG             | Favicon e iconos vectoriales                         |

---

## 📁 Estructura

```
Lab 3 de POE/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── .gitignore
├── scripts/
│   ├── copy-wasm.mjs          ← copia los .wasm de sql.js a /public
│   └── make-ico.mjs           ← genera el favicon.ico
├── src/
│   ├── main.ts                ← arranque de la aplicación
│   ├── vite-env.d.ts
│   ├── db/
│   │   ├── database.ts        ← conexión SQLite + persistencia
│   │   └── seed.ts            ← frases de fábrica
│   ├── models/
│   │   └── frase.ts           ← entidad, categorías, CRUD, votos y los mejores 10
│   ├── views/
│   │   └── arcadeView.ts      ← interfaz
│   ├── controllers/
│   │   └── arcadeController.ts← coordinación
│   └── styles/
│       └── styles.css
└── public/
    ├── favicon.svg
    ├── favicon.ico
    ├── fonts/                 ← tipografías autoalojadas
    └── sql-wasm*.wasm         ← generados por el postinstall
```

---

## ✅ Prueba rápida (lo que revisa el docente)

1. Abre la URL de Vercel: aparece el cuadro MEJORES 10 con 12 frases de fábrica.
2. Pulsa **▲ VOTAR** en cualquier tarjeta: el puntaje sube y el ranking se reordena.
3. Inserta una frase nueva con el formulario (**▶ INSERTAR FRASE**).
4. Pulsa **✎** en una tarjeta, cambia el texto y guarda.
5. Recarga la página: los votos y los cambios siguen ahí.
6. Pulsa **✕** y confirma en el modal de borrado: la frase desaparece y no vuelve.
7. Filtra por categoría, busca y ordena; todo se recalcula con SQL.

---

