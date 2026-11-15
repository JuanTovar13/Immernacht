import { create } from "zustand";
import type { RazaId } from "../types";
import * as motor from "./engine";
import type { OpcionDado, Partida, TipoJugador } from "./engine";

export interface ConfigAsiento {
  raza: RazaId;
  tipo: TipoJugador | "nadie";
}

interface DigitalState {
  partida: Partida | null;
  iniciar: (jugadores: { raza: RazaId; tipo: TipoJugador }[]) => void;
  tirar: () => void;
  sacar: () => void;
  mover: (fichaId: string, opcion: OpcionDado) => void;
  cerrarEvento: () => void;
  abandonar: () => void;
}

export const useDigitalStore = create<DigitalState>((set, get) => {
  const aplicar = (fn: (p: Partida) => Partida) => {
    const p = get().partida;
    if (p) set({ partida: fn(p) });
  };
  return {
    partida: null,
    iniciar: (jugadores) => set({ partida: motor.crearPartida(jugadores) }),
    tirar: () => aplicar(motor.tirar),
    sacar: () => aplicar(motor.sacarFicha),
    mover: (fichaId, opcion) => aplicar((p) => motor.mover(p, fichaId, opcion)),
    cerrarEvento: () => aplicar(motor.cerrarEvento),
    abandonar: () => set({ partida: null }),
  };
});
