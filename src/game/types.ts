export type RazaId = "humanos" | "elfos" | "enanos" | "nomuertos";

/** Orden fijo de turnos — la secuencia siempre es esta, solo el punto de
 *  partida (quién empieza) se elige al azar al iniciar la partida. */
export const ORDEN_RAZAS: RazaId[] = ["humanos", "elfos", "enanos", "nomuertos"];

export type TipoEvento = "celestial" | "natural" | "arcano" | "terrenal";

export type EfectoMatriz = "positivo" | "neutral" | "negativo";

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

// Matriz Raza x TipoEvento → Efecto (definida por el equipo; sin "inmune" desde los playtests)
export const MATRIZ_EFECTOS: Record<RazaId, Record<TipoEvento, EfectoMatriz>> = {
  humanos: { celestial: "positivo", natural: "neutral", arcano: "negativo", terrenal: "neutral" },
  elfos: { celestial: "neutral", natural: "positivo", arcano: "neutral", terrenal: "negativo" },
  enanos: { celestial: "neutral", natural: "negativo", arcano: "neutral", terrenal: "positivo" },
  nomuertos: { celestial: "negativo", natural: "neutral", arcano: "positivo", terrenal: "neutral" },
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
  { id: "maldicion-de-polimorfia", nombre: "Maldición de Polimorfia", tipo: "arcano", descripcion: "Un hechizo erróneo te convierte en sapo.", efecto: "Quedas ralentizado 2 turnos." },
  { id: "ataque-de-bestia", nombre: "Ataque de Bestia", tipo: "natural", descripcion: "Una criatura salvaje embiste a tu ficha.", efecto: "Tu ficha retrocede 5 casillas. Si cae sobre otra, la come." },
  { id: "simbiosis-de-enredaderas", nombre: "Simbiosis de Enredaderas", tipo: "natural", descripcion: "La vegetación del camino te impulsa hacia adelante.", efecto: "Avanzas 3 casillas y anulas el primer ataque o trampa hasta tu próximo turno." },
  { id: "rafaga-huracanada", nombre: "Ráfaga Huracanada", tipo: "terrenal", descripcion: "Un viento fuerte empuja todo a su paso.", efecto: "Las fichas a 2 casillas o menos avanzan 3." },
  { id: "pantano-de-lianas", nombre: "Pantano de Lianas", tipo: "natural", descripcion: "Las lianas de un pantano se enredan en tu ficha y frenan su paso.", efecto: "Quedas ralentizado 2 turnos." },
  { id: "tormenta-de-arena", nombre: "Tormenta de Arena", tipo: "terrenal", descripcion: "Una tormenta de arena envuelve tu ficha y la oculta de los enemigos.", efecto: "No te pueden comer hasta tu próximo turno." },
  { id: "estallido-runico", nombre: "Estallido Rúnico", tipo: "arcano", descripcion: "Una runa inestable explota junto a tu ficha.", efecto: "Tu ficha retrocede 5 casillas. Si cae sobre otra, la come." },
  { id: "runa-guardiana", nombre: "Runa Guardiana", tipo: "arcano", descripcion: "Un glifo protector aparece bajo tu ficha y la impulsa hacia adelante.", efecto: "Avanzas 3 casillas y anulas el primer ataque o trampa hasta tu próximo turno." },
  { id: "tromba-de-agua", nombre: "Tromba de Agua", tipo: "terrenal", descripcion: "Una crecida repentina arrastra las fichas.", efecto: "Tu ficha cambia de lugar con la más cercana a 5 casillas o menos." },
  { id: "himno-de-los-angeles", nombre: "Himno de los Ángeles", tipo: "celestial", descripcion: "Un coro divino guía a quienes lo escuchan.", efecto: "Las fichas a 2 casillas o menos avanzan 3." },
  { id: "cadenas-sagradas", nombre: "Cadenas Sagradas", tipo: "celestial", descripcion: "La diosa encadena el camino con luz.", efecto: "Esa casilla y la siguiente se bloquean 2 turnos." },
  { id: "estampida", nombre: "Estampida", tipo: "natural", descripcion: "Una manada desbocada cruza el campo de batalla.", efecto: "La ficha más adelantada retrocede 3 casillas y la más rezagada avanza 3." },
  { id: "derrumbe-de-rocas", nombre: "Derrumbe de Rocas", tipo: "terrenal", descripcion: "Una avalancha bloquea el camino de repente.", efecto: "Esa casilla y la siguiente se bloquean 2 turnos." },
];

/**
 * Eventos globales: muy raros, pueden ocurrir al final de cualquier turno y
 * afectan a todo el tablero por igual. La matriz de efectos no aplica.
 */
export interface EventoGlobalDef {
  id: string;
  nombre: string;
  tipo: "global";
  descripcion: string;
  efecto: string;
}

export const EVENTOS_GLOBALES: EventoGlobalDef[] = [
  { id: "tornado", nombre: "Tornado", tipo: "global", descripcion: "Un tornado nacido del Portal barre el mundo entero.", efecto: "Todas las fichas del recorrido avanzan 2 casillas, sin entrar al carril final." },
  { id: "retroceso-del-tiempo", nombre: "Retroceso del Tiempo", tipo: "global", descripcion: "El Portal invierte por un instante el curso del tiempo.", efecto: "Todas las fichas del recorrido retroceden 2 casillas, salvo las que están en una salida o un refugio." },
  { id: "niebla-espesa", nombre: "Niebla Espesa", tipo: "global", descripcion: "Una niebla impenetrable cubre el campo de batalla.", efecto: "Durante 2 rondas completas nadie puede capturar." },
  { id: "luna-sangrienta", nombre: "Luna Sangrienta", tipo: "global", descripcion: "La luna se tiñe de rojo y ninguna magia protectora resiste su furia.", efecto: "Durante 2 rondas completas los escudos, las protecciones, las fortalezas y los Refugios no surten efecto (las Salidas siguen protegiendo)." },
  { id: "sombra-del-eclipse", nombre: "Sombra del Eclipse", tipo: "global", descripcion: "La sombra del eclipse cae sobre todos los pueblos.", efecto: "Todos los jugadores quedan ralentizados durante su próximo turno." },
  { id: "llamado-del-portal", nombre: "Llamado del Portal", tipo: "global", descripcion: "El Portal llama a quienes aún esperan su oportunidad.", efecto: "Cada raza con fichas en la base saca una a su salida, si hay sitio." },
];

/** Aspecto de la carta de los eventos globales (no es un tipo de la matriz). */
export const INFO_GLOBAL = {
  id: "global" as const,
  nombre: "Global",
  icono: "🌘",
  brightVar: "--global-bright",
  deepVar: "--global-deep",
  glowVar: "--global-glow",
};
