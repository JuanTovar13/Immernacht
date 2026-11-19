import { motion } from "framer-motion";
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
      <motion.button
        onClick={() => {
          audioManager.playSfxBoton();
          if (disponible) void instalar();
          else setGuiaAbierta(true);
        }}
        className="flex items-center gap-3 rounded-md border px-4 py-2.5 text-left"
        style={{
          borderColor: "color-mix(in srgb, var(--arcano-bright) 65%, transparent)",
          background: "linear-gradient(180deg, rgba(178,127,232,0.18) 0%, rgba(178,127,232,0.05) 100%)",
          boxShadow: "0 0 22px rgba(178,127,232,0.18)",
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        whileTap={{ scale: 0.96 }}
      >
        <img src="/iconos/icono-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
        <span className="flex flex-col">
          <span className="flex items-center gap-1.5 font-display text-sm tracking-wide" style={{ color: "var(--arcano-glow)" }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            Instalar la app
          </span>
          <span className="text-[11px] text-[color:var(--color-parchment-dim)]">Gratis · juega desde tu pantalla de inicio</span>
        </span>
      </motion.button>

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
