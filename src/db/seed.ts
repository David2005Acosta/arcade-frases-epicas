import type { Categoria } from '../models/frase';

interface SemillaFrase {
  texto: string;
  autor: string;
  obra: string;
  categoria: Categoria;
  votos: number;
}

/**
 * Frases de fábrica con las que arranca el arcade la primera vez.
 * Los votos iniciales crean un ranking variado desde el primer segundo.
 */
export const FRASES_INICIALES: SemillaFrase[] = [
  {
    texto: 'Que la Fuerza te acompañe.',
    autor: 'Obi-Wan Kenobi',
    obra: 'Star Wars: Una nueva esperanza',
    categoria: 'cine',
    votos: 47,
  },
  {
    texto: '¡Es peligroso ir solo! Lleva esto.',
    autor: 'El anciano de la cueva',
    obra: 'The Legend of Zelda',
    categoria: 'videojuego',
    votos: 42,
  },
  {
    texto: 'Esto está bien.',
    autor: 'El perrito en llamas',
    obra: 'KC Green',
    categoria: 'meme',
    votos: 39,
  },
  {
    texto: 'La guerra. La guerra nunca cambia.',
    autor: 'El narrador',
    obra: 'Fallout',
    categoria: 'videojuego',
    votos: 35,
  },
  {
    texto: 'Voy a hacerle una oferta que no podrá rechazar.',
    autor: 'Don Vito Corleone',
    obra: 'El Padrino',
    categoria: 'cine',
    votos: 33,
  },
  {
    texto: '¿Serías tan amable?',
    autor: 'Andrew Ryan',
    obra: 'BioShock',
    categoria: 'videojuego',
    votos: 31,
  },
  {
    texto: 'No es mucho, pero es trabajo honesto.',
    autor: 'Anónimo',
    obra: 'Internet',
    categoria: 'meme',
    votos: 28,
  },
  {
    texto: 'Hasta el infinito y más allá.',
    autor: 'Buzz Lightyear',
    obra: 'Toy Story',
    categoria: 'cine',
    votos: 26,
  },
  {
    texto: 'El hombre adecuado en el lugar equivocado puede cambiarlo todo.',
    autor: 'G-Man',
    obra: 'Half-Life 2',
    categoria: 'videojuego',
    votos: 24,
  },
  {
    texto: 'Sospechoso.',
    autor: 'Tripulante sospechoso',
    obra: 'Among Us',
    categoria: 'meme',
    votos: 21,
  },
  {
    texto: 'Siempre nos quedará París.',
    autor: 'Rick Blaine',
    obra: 'Casablanca',
    categoria: 'cine',
    votos: 18,
  },
  {
    texto: 'Yo venía a ver memes, no a sentirme atacado.',
    autor: 'Anónimo',
    obra: 'Internet',
    categoria: 'meme',
    votos: 15,
  },
];
