import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { audioManager } from "../audio/audioManager";

/**
 * Cómo se muestran los eventos del Portal:
 * - normal: la tarjeta se queda hasta pulsar "Continuar".
 * - auto: la tarjeta se cierra sola cuando termina la voz del narrador.
 * - saltar: el evento se ve un momento (máx. 3 s), sin narrador.
 */
export type ModoEventos = "normal" | "auto" | "saltar";

export const MODOS_EVENTOS: { id: ModoEventos; nombre: string; detalle: string }[] = [
  { id: "normal", nombre: "Normal", detalle: "Pulsa Continuar para cerrar cada evento." },
  { id: "auto", nombre: "Automático", detalle: "El evento se cierra al terminar la voz del narrador." },
  { id: "saltar", nombre: "Rápido", detalle: "El evento se ve un instante, sin narrador." },
];

interface AjustesState {
  /** Volúmenes de 0 a 1 por canal. */
  musica: number;
  efectos: number;
  voces: number;
  silenciado: boolean;
  modoEventos: ModoEventos;
  /** El panel de ajustes no se guarda: siempre arranca cerrado. */
  panelAbierto: boolean;
  setVolumen: (canal: "musica" | "efectos" | "voces", valor: number) => void;
  toggleSilencio: () => void;
  setModoEventos: (modo: ModoEventos) => void;
  siguienteModo: () => void;
  abrirPanel: (abierto: boolean) => void;
}

export const useAjustes = create<AjustesState>()(
  persist(
    (set) => ({
      musica: 1,
      efectos: 1,
      voces: 1,
      silenciado: false,
      modoEventos: "normal",
      panelAbierto: false,
      setVolumen: (canal, valor) => set({ [canal]: Math.max(0, Math.min(1, valor)) } as Pick<AjustesState, typeof canal>),
      toggleSilencio: () => set((s) => ({ silenciado: !s.silenciado })),
      setModoEventos: (modoEventos) => set({ modoEventos }),
      siguienteModo: () =>
        set((s) => {
          const i = MODOS_EVENTOS.findIndex((m) => m.id === s.modoEventos);
          return { modoEventos: MODOS_EVENTOS[(i + 1) % MODOS_EVENTOS.length].id };
        }),
      abrirPanel: (panelAbierto) => set({ panelAbierto }),
    }),
    {
      name: "immernacht-ajustes",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ musica, efectos, voces, silenciado, modoEventos }) => ({ musica, efectos, voces, silenciado, modoEventos }),
    }
  )
);

// Mantiene el gestor de audio sincronizado con los ajustes (al cargar y en cada cambio).
function aplicar(s: AjustesState) {
  audioManager.aplicarAjustes({ musica: s.musica, efectos: s.efectos, voces: s.voces, silenciado: s.silenciado });
}
aplicar(useAjustes.getState());
useAjustes.subscribe(aplicar);
