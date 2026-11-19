import { useEffect, useRef, useState } from "react";
import { audioManager } from "../audio/audioManager";
import { useAjustes, type ModoEventos } from "./ajustes";

/**
 * Narración de los eventos desactivada mientras se graban las voces de los eventos nuevos.
 * Para volver a activarla, cambia esto a true.
 */
export const NARRAR_EVENTOS = false;
/** Sin narración, el modo automático cierra el evento tras este tiempo de lectura. */
const LECTURA_AUTO = 7000;

/**
 * Reproduce la narración de un evento y lo cierra solo según el modo elegido:
 * - normal: solo narra; se cierra con "Continuar".
 * - auto: narra y se cierra poco después de que termine la voz
 *   (sin narración, se cierra tras un tiempo de lectura).
 * - saltar: no narra y se cierra a los `duracionRapida` ms.
 *
 * El modo se fija al abrir el evento (cambiarlo a mitad de un evento aplica al siguiente).
 * Devuelve el modo y un factor para acelerar las animaciones de entrada en modo rápido.
 */
export function useModoEvento(
  narracionId: string,
  cerrar: () => void,
  { retraso = 500, duracionRapida = 2600 }: { retraso?: number; duracionRapida?: number } = {}
): { modo: ModoEventos; ritmo: number } {
  const [modo] = useState(() => useAjustes.getState().modoEventos);
  const cerrarRef = useRef(cerrar);
  useEffect(() => {
    cerrarRef.current = cerrar;
  });

  useEffect(() => {
    let activo = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const fin = () => {
      if (activo) cerrarRef.current();
    };
    if (modo === "saltar") {
      timers.push(setTimeout(fin, duracionRapida));
    } else if (!NARRAR_EVENTOS) {
      if (modo === "auto") timers.push(setTimeout(fin, LECTURA_AUTO));
    } else {
      timers.push(
        setTimeout(() => {
          if (!activo) return;
          audioManager.playNarracion(narracionId, modo === "auto" ? () => timers.push(setTimeout(fin, 900)) : undefined);
        }, retraso)
      );
    }
    return () => {
      activo = false;
      timers.forEach(clearTimeout);
    };
  }, [narracionId, modo, retraso, duracionRapida]);

  return { modo, ritmo: modo === "saltar" ? 0.35 : 1 };
}
