import { motion } from "framer-motion";
import { useEffect } from "react";
import { EventThemeMotif } from "../EventThemeMotif";
import { RevealWords } from "../RevealWords";
import { MATRIZ_EFECTOS, RAZAS, TIPOS_EVENTO } from "../../game/types";
import { EFECTO_INFO } from "../../game/lore";
import type { ResultadoEvento } from "../../game/digital/engine";
import { audioManager } from "../../audio/audioManager";
import { useModoEvento } from "../../game/useModoEvento";

/** Revelación de un evento del Portal dentro de la partida digital. */
export function EventOverlay({ resultado, onContinuar }: { resultado: ResultadoEvento; onContinuar: () => void }) {
  const { evento, raza, lineas } = resultado;
  const info = TIPOS_EVENTO[evento.tipo];
  const efecto = MATRIZ_EFECTOS[raza][evento.tipo];

  const cerrar = () => {
    audioManager.detenerNarracion();
    audioManager.detenerSfxEvento();
    onContinuar();
  };
  // Narración y cierre automático según el modo de eventos (normal / auto / rápido).
  const { ritmo } = useModoEvento(evento.id, cerrar, { duracionRapida: 2000 });
  const t = (s: number) => s * ritmo;

  useEffect(() => {
    audioManager.playSfxRevelacion(evento.tipo);
    const tAccion = setTimeout(() => audioManager.playSfxEvento(evento.id), t(2900));
    return () => clearTimeout(tAccion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento.id, evento.tipo]);

  const continuar = () => {
    audioManager.playSfxBoton();
    cerrar();
  };

  return (
    <motion.div
      className="absolute inset-0 z-40 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(120% 100% at 50% 35%, color-mix(in srgb, var(${info.deepVar}) 92%, transparent) 0%, rgba(5,7,16,0.94) 78%)` }}
      />
      <EventThemeMotif tipo={evento.tipo} />
      <div className="absolute inset-0 overflow-y-auto">
        <div className="relative flex min-h-full flex-col items-center justify-center gap-5 px-6 py-10">
          <motion.div
            className="flex w-full max-w-sm flex-col items-center gap-3 rounded-md border px-6 py-7"
            style={{
              background: "rgba(5,7,15,0.6)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              borderColor: `color-mix(in srgb, var(${info.brightVar}) 35%, transparent)`,
            }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: t(0.3) }}
          >
            <div
              className="flex items-center gap-2 rounded-full border px-4 py-1"
              style={{
                borderColor: `color-mix(in srgb, var(${info.brightVar}) 55%, transparent)`,
                background: `color-mix(in srgb, var(${info.deepVar}) 70%, transparent)`,
              }}
            >
              <span>{info.icono}</span>
              <span className="font-display text-xs tracking-wide" style={{ color: `var(${info.brightVar})` }}>
                {info.nombre}
              </span>
            </div>
            <h2
              className="text-center font-display text-2xl leading-tight"
              style={{ color: `var(${info.brightVar})`, filter: `drop-shadow(0 0 16px color-mix(in srgb, var(${info.glowVar}) 60%, transparent))` }}
            >
              <RevealWords texto={evento.nombre} delayStart={t(0.7)} stagger={0.1 * ritmo} />
            </h2>
            <p className="text-center text-sm text-[color:var(--color-parchment)]">
              <RevealWords texto={evento.descripcion} delayStart={t(1.2)} stagger={0.03 * ritmo} />
            </p>
            <motion.p
              className="text-center text-xs text-[color:var(--color-parchment-dim)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: t(1.8) }}
            >
              {evento.efecto}
            </motion.p>

            <motion.div
              className="mt-2 w-full border-t pt-3"
              style={{ borderColor: `color-mix(in srgb, var(${info.brightVar}) 35%, transparent)` }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: t(2.3) }}
            >
              <div className="mb-2 flex items-center justify-center gap-2 text-xs">
                <img src={RAZAS[raza].logo} alt="" className="h-5 w-5 object-contain" />
                <span className="text-[color:var(--color-muted)]">{RAZAS[raza].nombre}:</span>
                <span style={{ color: EFECTO_INFO[efecto].color }}>{EFECTO_INFO[efecto].label}</span>
              </div>
              <ul className="space-y-1.5">
                {lineas.map((l, i) => (
                  <li key={i} className="text-center text-sm leading-snug text-[color:var(--color-parchment)]">
                    {l}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          <motion.button
            onClick={continuar}
            className="rounded-sm border px-9 py-3 font-display text-sm tracking-wide"
            style={{ borderColor: `color-mix(in srgb, var(${info.brightVar}) 60%, transparent)`, color: `var(${info.brightVar})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: t(2.6) }}
            whileTap={{ scale: 0.95 }}
          >
            Continuar
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
