import { useState } from "react";
import { useInstalar } from "../game/instalar";
import { audioManager } from "../audio/audioManager";
import { InfoModal } from "./InfoModal";

/**
 * "Instalar la app": en Android y PC abre el aviso del navegador; en iPhone explica
 * los pasos de Safari. No aparece si ya se juega desde la app instalada.
 */
export function BotonInstalar() {
  const { disponible, esIOS, instalada, instalar } = useInstalar();
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  if (instalada || (!disponible && !esIOS)) return null;

  return (
    <>
      <button
        onClick={() => {
          audioManager.playSfxBoton();
          if (disponible) void instalar();
          else setGuiaAbierta(true);
        }}
        className="flex items-center justify-center gap-1.5 py-1 text-xs text-[color:var(--color-parchment-dim)] underline-offset-4 hover:text-[color:var(--color-parchment)] hover:underline"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M12 7v7M9 11l3 3 3-3" />
        </svg>
        Instalar la app
      </button>

      <InfoModal open={guiaAbierta} capa="z-50" onClose={() => setGuiaAbierta(false)}>
        <h3 className="mb-3 text-center font-display text-lg text-[color:var(--color-eclipse-gold)]">Instalar en iPhone</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-snug text-[color:var(--color-parchment-dim)]">
          <li>Abre esta página en <b className="text-[color:var(--color-parchment)]">Safari</b>.</li>
          <li>
            Toca el botón <b className="text-[color:var(--color-parchment)]">Compartir</b> (el cuadrado con una flecha hacia arriba).
          </li>
          <li>
            Elige <b className="text-[color:var(--color-parchment)]">Agregar a pantalla de inicio</b> y luego <b className="text-[color:var(--color-parchment)]">Agregar</b>.
          </li>
        </ol>
        <p className="mt-3 text-center text-xs text-[color:var(--color-muted)]">Immernacht quedará con su ícono, como cualquier otra app.</p>
      </InfoModal>
    </>
  );
}
