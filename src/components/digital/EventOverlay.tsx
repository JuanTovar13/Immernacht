import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EventThemeMotif } from "../EventThemeMotif";
import { RevealWords } from "../RevealWords";
import { INFO_GLOBAL, TIPOS_EVENTO } from "../../game/types";
import { EFECTO_INFO } from "../../game/lore";
import type { ResultadoEvento } from "../../game/digital/engine";
import { audioManager } from "../../audio/audioManager";
import { useModoEvento } from "../../game/useModoEvento";
import { useTeclaContinuar } from "../../game/useTeclaContinuar";

/** Revelación de un evento del Portal dentro de la partida digital. */
export function EventOverlay({ resultado, onContinuar }: { resultado: ResultadoEvento; onContinuar: () => void }) {
  // `texto` puede faltar en partidas en línea creadas antes de este cambio.
  const { evento, texto, resumen, lineas } = resultado;
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const esGlobal = evento.tipo === "global";
  const info = evento.tipo === "global" ? INFO_GLOBAL : TIPOS_EVENTO[evento.tipo];

  const cerrar = () => {
    audioManager.detenerNarracion();
    audioManager.detenerSfxEvento();
    onContinuar();
  };
  // Si el jugador abrió "Más información", la tarjeta espera a que pulse "Continuar".
  const detalleRef = useRef(false);
  useEffect(() => {
    detalleRef.current = detalleAbierto;
  }, [detalleAbierto]);
  const cerrarAuto = () => {
    if (!detalleRef.current) cerrar();
  };
  // Narración y cierre automático según el modo de eventos (normal / auto / rápido).
  const { ritmo } = useModoEvento(evento.id, cerrarAuto, { duracionRapida: 2000 });
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
  useTeclaContinuar(continuar);

  return (
    <motion.div
      className="absolute inset-0 z-40 overflow-hidden"
      data-tarjeta-evento
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
                {esGlobal ? "Evento global" : info.nombre}
              </span>
            </div>
            {esGlobal && (
              <motion.p
                className="text-center text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-parchment-dim)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: t(0.5) }}
              >
                Afecta a todos por igual
              </motion.p>
            )}
            <h2
              className="text-center font-display text-2xl leading-tight"
              style={{ color: `var(${info.brightVar})`, filter: `drop-shadow(0 0 16px color-mix(in srgb, var(${info.glowVar}) 60%, transparent))` }}
            >
              <RevealWords texto={evento.nombre} delayStart={t(0.7)} stagger={0.1 * ritmo} />
            </h2>
            <p className="text-center text-sm text-[color:var(--color-parchment)]">
              <RevealWords texto={evento.descripcion} delayStart={t(1.2)} stagger={0.03 * ritmo} />
            </p>
            {/* El efecto con la matriz ya aplicada: verde si va a favor, rojo si va en contra. */}
            <motion.p
              className="text-center text-sm leading-snug text-[color:var(--color-parchment)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: t(1.8) }}
            >
              {(texto ?? [{ t: evento.efecto }]).map((seg, i) =>
                seg.e ? (
                  <span key={i} className="font-semibold" style={{ color: EFECTO_INFO[seg.e].color }}>
                    {seg.t}
                  </span>
                ) : (
                  <span key={i}>{seg.t}</span>
                )
              )}
            </motion.p>

            {/* Abajo solo el desplegable con lo que pasó exactamente en esta jugada. */}
            <motion.div
              className="mt-2 w-full border-t pt-3"
              style={{ borderColor: `color-mix(in srgb, var(${info.brightVar}) 35%, transparent)` }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: t(2.3) }}
            >
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      setDetalleAbierto((v) => !v);
                      // Tras un clic con el ratón suelta el foco, para que Espacio/Enter sigan sirviendo para continuar.
                      if (e.detail > 0) e.currentTarget.blur();
                    }}
                    aria-expanded={detalleAbierto}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-[color:var(--color-parchment-dim)] transition-colors hover:text-[color:var(--color-parchment)]"
                    style={{ borderColor: `color-mix(in srgb, var(${info.brightVar}) 30%, transparent)` }}
                  >
                    Más información
                    <motion.span animate={{ rotate: detalleAbierto ? 180 : 0 }} transition={{ duration: 0.2 }} className="inline-block">
                      ▾
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {detalleAbierto && (
                      <motion.div
                        className="w-full overflow-hidden"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className="pt-3 text-center text-sm leading-snug text-[color:var(--color-parchment)]">{resumen}</p>
                        {lineas.length > 0 && (
                          <ul className="mt-1.5 space-y-1">
                            {lineas.map((l, i) => (
                              <li key={i} className="text-center text-xs leading-snug text-[color:var(--color-parchment-dim)]">
                                {l}
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
