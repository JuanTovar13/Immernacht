import { create } from "zustand";
import { EVENTOS, ORDEN_RAZAS, type EventoDef, type RazaId } from "./types";
 
/** "configDigital" y "digital" son la versión puramente digital (sin tablero físico). */
export type EstadoApp = "inicio" | "preparacion" | "partida" | "evento" | "final" | "configDigital" | "digital";
 
interface GameState {
  estado: EstadoApp;
  razasActivas: RazaId[];
 
  eventoActual: EventoDef | null;
  /** true cuando le tocó a este turno el 65% de "no pasa nada" */
  eventoNulo: boolean;
 
  /** Raza que ganó (la reporta el Arduino). null si no se sabe (ej. botón de simulación). */
  ganador: RazaId | null;
 
  /** Turno: la secuencia es siempre humanos → elfos → enanos → no-muertos → (repite).
   *  Lo único aleatorio es quién empieza (turnoIndice inicial). */
  turnoIndice: number;
  turnoActual: RazaId;
 
  audioActivo: boolean;
 
  irA: (estado: EstadoApp) => void;
  /** Se llama una sola vez, al comenzar la partida: elige al azar quién inicia. */
  iniciarPartida: () => void;
  /** 35% de probabilidad de que ocurra un evento real; 65% de que no pase nada. */
  activarEvento: () => void;
  /** Cierra el evento, vuelve a la partida y avanza el turno según la secuencia fija. */
  cerrarEvento: () => void;
  /** Se llamará cuando el Arduino confirme que las 4 fichas llegaron a la meta. */
  partidaTerminada: (ganador?: RazaId) => void;
  toggleAudio: () => void;
}
 
export const useGameStore = create<GameState>((set) => ({
  estado: "inicio",
  razasActivas: [],
  eventoActual: null,
  eventoNulo: false,
  ganador: null,
  turnoIndice: 0,
  turnoActual: "humanos",
  audioActivo: true,
 
  irA: (estado) => set({ estado }),
 
  iniciarPartida: () => {
    const inicio = Math.floor(Math.random() * ORDEN_RAZAS.length);
    set({ turnoIndice: inicio, turnoActual: ORDEN_RAZAS[inicio], ganador: null });
  },
 
  activarEvento: () => {
    const ocurre = Math.random() < 0.35; // 35% de probabilidad de evento real
    if (ocurre) {
      const evento = EVENTOS[Math.floor(Math.random() * EVENTOS.length)];
      set({ estado: "evento", eventoActual: evento, eventoNulo: false });
    } else {
      set({ estado: "evento", eventoActual: null, eventoNulo: true });
    }
  },
 
  cerrarEvento: () =>
    set((s) => {
      const turnoIndice = (s.turnoIndice + 1) % ORDEN_RAZAS.length;
      return {
        estado: "partida",
        eventoActual: null,
        eventoNulo: false,
        turnoIndice,
        turnoActual: ORDEN_RAZAS[turnoIndice],
      };
    }),
 
  partidaTerminada: (ganador) => set({ estado: "final", ganador: ganador ?? null }),
  toggleAudio: () => set((s) => ({ audioActivo: !s.audioActivo })),
}));
 