import { useEffect, useRef } from "react";
import { useAjustes } from "./ajustes";

const INTERACTIVO = 'button, a, input, textarea, select, [contenteditable="true"]';

/**
 * Espacio o Enter equivalen a pulsar "Continuar".
 * Si el foco está en un botón de la propia tarjeta (marcada con data-tarjeta-evento), la tecla
 * hace la acción de ese botón (p. ej. abrir "Más información"). Un botón que quedó con el foco
 * detrás de la tarjeta no se activa. Tampoco actúa con las reglas o los ajustes abiertos.
 */
export function useTeclaContinuar(continuar: () => void) {
  const ref = useRef(continuar);
  useEffect(() => {
    ref.current = continuar;
  });

  useEffect(() => {
    // Una sola vez por tarjeta: mientras se desvanece, otra pulsación no debe cerrar de nuevo.
    let hecho = false;
    const alPulsar = (e: KeyboardEvent) => {
      if (hecho) return;
      if (e.key !== " " && e.key !== "Enter") return;
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest(INTERACTIVO) && el.closest("[data-tarjeta-evento]")) return;
      const { panelAbierto, reglasAbiertas } = useAjustes.getState();
      if (panelAbierto || reglasAbiertas) return;
      e.preventDefault(); // que el espacio no desplace la página ni active un botón de atrás
      hecho = true;
      ref.current();
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);
}
