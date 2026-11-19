import { create } from "zustand";
import type { RazaId } from "../types";
import * as motor from "./engine";
import type { OpcionDado, Partida, TipoJugador } from "./engine";
import type { AccionJuego } from "../online/protocolo";

export interface ConfigAsiento {
  raza: RazaId;
  tipo: TipoJugador | "nadie";
}

interface DigitalState {
  partida: Partida | null;
  /** local: todo en este dispositivo. online: la partida la lleva el servidor. */
  modo: "local" | "online";
  /** En línea: las razas que controla este dispositivo. */
  misRazas: RazaId[];
  /** En línea: nombre de quien controla cada raza humana. */
  nombres: Partial<Record<RazaId, string>>;
  /** En línea: envía una acción al servidor. */
  remoto: ((a: AccionJuego) => void) | null;
  iniciar: (jugadores: { raza: RazaId; tipo: TipoJugador }[]) => void;
  tirar: () => void;
  sacar: () => void;
  mover: (fichaId: string, opcion: OpcionDado) => void;
  cerrarEvento: () => void;
  abandonar: () => void;
  recibirOnline: (p: Partida, misRazas: RazaId[], nombres: Partial<Record<RazaId, string>>, remoto: (a: AccionJuego) => void) => void;
  salirDeOnline: () => void;
}

export const useDigitalStore = create<DigitalState>((set, get) => {
  /** En local aplica el motor; en línea manda la acción y espera la respuesta del servidor. */
  const hacer = (accion: AccionJuego, fn: (p: Partida) => Partida) => {
    const { partida, modo, remoto } = get();
    if (!partida) return;
    if (modo === "online") remoto?.(accion);
    else set({ partida: fn(partida) });
  };
  return {
    partida: null,
    modo: "local",
    misRazas: [],
    nombres: {},
    remoto: null,
    iniciar: (jugadores) => set({ partida: motor.crearPartida(jugadores), modo: "local", misRazas: [], nombres: {}, remoto: null }),
    tirar: () => hacer({ tipo: "tirar" }, motor.tirar),
    sacar: () => hacer({ tipo: "sacar" }, motor.sacarFicha),
    mover: (fichaId, opcion) => hacer({ tipo: "mover", fichaId, opcion }, (p) => motor.mover(p, fichaId, opcion)),
    cerrarEvento: () => hacer({ tipo: "cerrarEvento" }, motor.cerrarEvento),
    abandonar: () => set({ partida: null, modo: "local", misRazas: [], nombres: {}, remoto: null }),
    recibirOnline: (partida, misRazas, nombres, remoto) => set({ partida, modo: "online", misRazas, nombres, remoto }),
    salirDeOnline: () => {
      if (get().modo === "online") set({ partida: null, modo: "local", misRazas: [], nombres: {}, remoto: null });
    },
  };
});
