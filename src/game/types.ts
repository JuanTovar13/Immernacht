export type RazaId = "humanos" | "elfos" | "enanos" | "nomuertos";

/** Orden fijo de turnos — la secuencia siempre es esta, solo el punto de
 *  partida (quién empieza) se elige al azar al iniciar la partida. */
export const ORDEN_RAZAS: RazaId[] = ["humanos", "elfos", "enanos", "nomuertos"];

export type TipoEvento = "celestial" | "natural" | "arcano" | "terrenal";

export type EfectoMatriz = "positivo" | "neutral" | "negativo" | "inmune";

export interface Raza {
  id: RazaId;
  nombre: string;
  icono: string; // emoji temporal (se sigue usando en la insignia de tipo de evento, no en los logos de raza)
  colorVar: string; // referencia a la variable CSS --raza-*
  logo: string; // ruta del logo oficial del equipo, en /public/logos/
}

export const RAZAS: Record<RazaId, Raza> = {
  humanos: { id: "humanos", nombre: "Humanos", icono: "☀️", colorVar: "--raza-humanos", logo: "/logos/humanos.png" },
  elfos: { id: "elfos", nombre: "Elfos", icono: "🍃", colorVar: "--raza-elfos", logo: "/logos/elfos.png" },
  enanos: { id: "enanos", nombre: "Enanos", icono: "⚒️", colorVar: "--raza-enanos", logo: "/logos/enanos.png" },
  nomuertos: { id: "nomuertos", nombre: "No-Muertos", icono: "💀", colorVar: "--raza-nomuertos", logo: "/logos/nomuertos.png" },
};

export interface TipoEventoInfo {
  id: TipoEvento;
  nombre: string;
  icono: string;
  brightVar: string;
  deepVar: string;
  glowVar: string;
}

export const TIPOS_EVENTO: Record<TipoEvento, TipoEventoInfo> = {
  celestial: { id: "celestial", nombre: "Celestial", icono: "☀️", brightVar: "--celestial-bright", deepVar: "--celestial-deep", glowVar: "--celestial-glow" },
  natural: { id: "natural", nombre: "Natural", icono: "🌿", brightVar: "--natural-bright", deepVar: "--natural-deep", glowVar: "--natural-glow" },
  arcano: { id: "arcano", nombre: "Arcano", icono: "🔮", brightVar: "--arcano-bright", deepVar: "--arcano-deep", glowVar: "--arcano-glow" },
  terrenal: { id: "terrenal", nombre: "Terrenal", icono: "🪨", brightVar: "--terrenal-bright", deepVar: "--terrenal-deep", glowVar: "--terrenal-glow" },
};

// Matriz Raza x TipoEvento → Efecto (definida por el usuario, no modificar)
export const MATRIZ_EFECTOS: Record<RazaId, Record<TipoEvento, EfectoMatriz>> = {
  humanos: { celestial: "positivo", natural: "neutral", arcano: "negativo", terrenal: "inmune" },
  elfos: { celestial: "inmune", natural: "positivo", arcano: "neutral", terrenal: "negativo" },
  enanos: { celestial: "negativo", natural: "inmune", arcano: "positivo", terrenal: "neutral" },
  nomuertos: { celestial: "neutral", natural: "negativo", arcano: "inmune", terrenal: "positivo" },
};

export interface EventoDef {
  id: string;
  nombre: string;
  tipo: TipoEvento;
  descripcion: string;
  efecto: string;
}

export const EVENTOS: EventoDef[] = [
  { id: "escudo-de-luz", nombre: "Escudo de Luz", tipo: "celestial", descripcion: "Un aura protectora rodea tu ficha.", efecto: "No te pueden comer hasta tu próximo turno." },
  { id: "juicio-divino", nombre: "Juicio Divino", tipo: "celestial", descripcion: "La diosa de la justicia equipara el terreno.", efecto: "La ficha más adelantada retrocede 3 casillas y la más rezagada avanza 3." },
  { id: "intercambio-dimensional", nombre: "Intercambio Dimensional", tipo: "arcano", descripcion: "Desplazamiento mágico de materia.", efecto: "Tu ficha cambia de lugar con la más cercana a 5 casillas o menos." },
  { id: "maldicion-de-polimorfia", nombre: "Maldición de Polimorfia", tipo: "arcano", descripcion: "Un hechizo erróneo te convierte en sapo.", efecto: "Tus dados valen la mitad 2 turnos (1 con efecto a favor)." },
  { id: "ataque-de-bestia", nombre: "Ataque de Bestia", tipo: "natural", descripcion: "Un lobo o criatura salvaje embiste a tu ficha.", efecto: "Tu ficha retrocede 5 casillas. Si cae sobre otra, la come." },
  { id: "simbiosis-de-enredaderas", nombre: "Simbiosis de Enredaderas", tipo: "natural", descripcion: "La vegetación del camino te impulsa hacia adelante.", efecto: "Avanzas 3 casillas y anulas el primer ataque o trampa hasta tu próximo turno." },
  { id: "rafaga-huracanada", nombre: "Ráfaga Huracanada", tipo: "terrenal", descripcion: "Un viento fuerte empuja todo a su paso.", efecto: "Las fichas a 2 casillas o menos avanzan 3." },
  { id: "arenas-movedizas", nombre: "Arenas Movedizas", tipo: "terrenal", descripcion: "El suelo se vuelve arena y te traga poco a poco.", efecto: "Tus dados valen la mitad 2 turnos (1 con efecto a favor)." },
  { id: "camuflaje-silvestre", nombre: "Camuflaje Silvestre", tipo: "natural", descripcion: "El follaje del bosque cubre tu ficha y la oculta de los cazadores.", efecto: "No te pueden comer hasta tu próximo turno." },
  { id: "estallido-runico", nombre: "Estallido Rúnico", tipo: "arcano", descripcion: "Una runa inestable explota junto a tu ficha.", efecto: "Tu ficha retrocede 5 casillas. Si cae sobre otra, la come." },
  { id: "runa-guardiana", nombre: "Runa Guardiana", tipo: "arcano", descripcion: "Un glifo protector aparece bajo tu ficha y la impulsa hacia adelante.", efecto: "Avanzas 3 casillas y anulas el primer ataque o trampa hasta tu próximo turno." },
  { id: "tromba-de-agua", nombre: "Tromba de Agua", tipo: "terrenal", descripcion: "Una crecida repentina arrastra las fichas.", efecto: "Tu ficha cambia de lugar con la más cercana a 5 casillas o menos." },
  { id: "himno-de-los-angeles", nombre: "Himno de los Ángeles", tipo: "celestial", descripcion: "Un coro divino guía a quienes lo escuchan.", efecto: "Las fichas a 2 casillas o menos avanzan 3." },
  { id: "cadenas-sagradas", nombre: "Cadenas Sagradas", tipo: "celestial", descripcion: "La diosa encadena el camino con luz.", efecto: "Esa casilla y la siguiente se bloquean 2 turnos (1 con efecto a favor)." },
  { id: "estampida", nombre: "Estampida", tipo: "natural", descripcion: "Una manada desbocada cruza el campo de batalla.", efecto: "La ficha más adelantada retrocede 3 casillas y la más rezagada avanza 3." },
  { id: "derrumbe-de-rocas", nombre: "Derrumbe de Rocas", tipo: "terrenal", descripcion: "Una avalancha bloquea el camino de repente.", efecto: "Esa casilla y la siguiente se bloquean 2 turnos (1 con efecto a favor)." },
];
