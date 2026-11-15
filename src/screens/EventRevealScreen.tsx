import { motion } from "framer-motion";
import { useEffect } from "react";
import { EventThemeMotif } from "../components/EventThemeMotif";
import { ArcaneVortex } from "../components/ArcaneVortex";
import { RevealWords } from "../components/RevealWords";
import { StarField } from "../components/StarField";
import { TIPOS_EVENTO, type EventoDef } from "../game/types";
import { useGameStore } from "../game/store";
import { audioManager } from "../audio/audioManager";
import { useModoEvento } from "../game/useModoEvento";

export function EventRevealScreen() {
  const evento = useGameStore((s) => s.eventoActual);
  const eventoNulo = useGameStore((s) => s.eventoNulo);
  const cerrarEvento = useGameStore((s) => s.cerrarEvento);

  // cerrar: sin sonido de botón (lo usa también el cierre automático).
  const cerrar = () => {
    audioManager.detenerNarracion();
    audioManager.detenerSfxEvento();
    cerrarEvento();
  };

  if (eventoNulo) {
    return <NadaOcurreScreen onCerrar={cerrar} />;
  }
  if (!evento) return null;
  return <EventoRevelado evento={evento} onCerrar={cerrar} />;
}

/* ================= Un evento real ocurrió ================= */
function EventoRevelado({ evento, onCerrar }: { evento: EventoDef; onCerrar: () => void }) {
  const info = TIPOS_EVENTO[evento.tipo];
  const esTerrenal = evento.tipo === "terrenal";
  // Narración y cierre automático según el modo de eventos (normal / auto / rápido).
  const { ritmo } = useModoEvento(evento.id, onCerrar, { duracionRapida: 2400 });
  const t = (s: number) => s * ritmo;
  const onContinuar = () => {
    audioManager.playSfxBoton();
    onCerrar();
  };

  useEffect(() => {
    audioManager.playSfxRevelacion(evento.tipo);
    const tAccion = setTimeout(() => audioManager.playSfxEvento(evento.id), t(2900));
    return () => clearTimeout(tAccion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento.id]);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden bg-noise"
      style={{ background: "var(--color-void-deep)" }}
      animate={esTerrenal ? { opacity: 1, scale: 1, x: [0, -6, 5, -4, 3, 0], y: [0, 4, -3, 2, 0] } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="absolute inset-0" style={{ background: `radial-gradient(120% 100% at 50% 32%, var(${info.deepVar}) 0%, var(--color-void-deep) 78%)` }} />

      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `var(${info.brightVar})` }}
        initial={{ width: 6, height: 6, opacity: 1 }}
        animate={{ width: "240vw", height: "240vw", opacity: 0 }}
        transition={{ duration: 0.75, ease: [0.15, 0.8, 0.3, 1] }}
      />

      <EventThemeMotif tipo={evento.tipo} />

      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 150px 45px rgba(0,0,0,0.8)" }} />

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-none">
      <div className="relative flex min-h-full w-full flex-col items-center justify-center gap-4 px-8">
        <motion.div
          className="flex w-full max-w-sm flex-col items-center gap-4 rounded-md border px-6 py-8"
          style={{
            background: "rgba(5,7,15,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderColor: `color-mix(in srgb, var(${info.brightVar}) 30%, transparent)`,
          }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: t(0.45), ease: "easeOut" }}
        >
          <motion.div
            className="flex items-center gap-2 rounded-full border px-4 py-1.5"
            style={{
              borderColor: `color-mix(in srgb, var(${info.brightVar}) 55%, transparent)`,
              background: `color-mix(in srgb, var(${info.deepVar}) 70%, transparent)`,
            }}
            initial={{ opacity: 0, scale: 0.5, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 15, delay: t(0.65) }}
          >
            <span className="text-base leading-none">{info.icono}</span>
            <span className="font-display text-xs tracking-wide" style={{ color: `var(${info.brightVar})` }}>
              {info.nombre}
            </span>
          </motion.div>

          <h2
            className="text-center font-display text-2xl leading-tight sm:text-3xl"
            style={{ color: `var(${info.brightVar})`, filter: `drop-shadow(0 0 18px color-mix(in srgb, var(${info.glowVar}) 60%, transparent))` }}
          >
            <RevealWords texto={evento.nombre} delayStart={t(1.3)} stagger={0.1 * ritmo} />
          </h2>

          <p className="max-w-xs text-center text-sm text-[color:var(--color-parchment)] sm:text-base">
            <RevealWords texto={evento.descripcion} delayStart={t(2.05)} stagger={0.032 * ritmo} />
          </p>

          <motion.div
            className="mt-1 w-full overflow-hidden border-t border-b px-4 py-3 text-center"
            style={{ borderColor: `color-mix(in srgb, var(${info.brightVar}) 45%, transparent)` }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: t(2.9), ease: "easeOut" }}
          >
            <motion.p
              className="text-sm text-[color:var(--color-parchment)] sm:text-base"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: t(3.15), duration: 0.5 }}
            >
              {evento.efecto}
            </motion.p>
          </motion.div>
        </motion.div>

        <motion.button
          onClick={onContinuar}
          className="mt-6 rounded-sm border px-9 py-3 font-display text-sm tracking-wide"
          style={{ borderColor: `color-mix(in srgb, var(${info.brightVar}) 60%, transparent)`, color: `var(${info.brightVar})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ opacity: { duration: 2.2, repeat: Infinity, delay: t(3.9) } }}
          whileTap={{ scale: 0.95 }}
        >
          Continuar
        </motion.button>
      </div>
      </div>
    </motion.div>
  );
}

/* ================= 75% de las veces: no ocurre nada — portal en blanco y negro ================= */
function NadaOcurreScreen({ onCerrar }: { onCerrar: () => void }) {
  const { ritmo } = useModoEvento("nada-ocurre", onCerrar, { duracionRapida: 2000 });
  const t = (s: number) => s * ritmo;
  const onContinuar = () => {
    audioManager.playSfxBoton();
    onCerrar();
  };
  useEffect(() => {
    audioManager.playSfxNadaOcurre();
  }, []);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "#000000", filter: "grayscale(1) contrast(1.05)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <StarField count={26} />
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 160px 50px rgba(0,0,0,0.85)" }} />

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-none">
      <div className="relative flex min-h-full w-full flex-col items-center justify-center gap-7 px-8">
        {/* El mismo Nexo del Portal que en el resto de la app — aquí inerte, sin color */}
        <div className="relative flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
          <ArcaneVortex
            size={280}
            brightColor="#c7c9d4"
            glowColor="#e8e9ee"
            deepColor="#16161a"
            haloColor="rgba(200,200,210,0.35)"
            haloColorDeep="rgba(120,120,130,0.12)"
            ringAccent="#8c8d96"
            coreHighlight="#ffffff"
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-center font-display text-xl text-white/85 sm:text-2xl">
            <RevealWords texto="El Portal Guarda Silencio" delayStart={t(0.9)} stagger={0.09 * ritmo} />
          </h2>
          <p className="max-w-xs text-center text-sm text-white/45 sm:text-base">
            <RevealWords texto="Ningún augurio se manifiesta esta vez." delayStart={t(1.7)} stagger={0.045 * ritmo} />
          </p>
        </div>

        <motion.button
          onClick={onContinuar}
          className="mt-4 rounded-sm border px-9 py-3 font-display text-sm tracking-wide text-white/75"
          style={{ borderColor: "rgba(255,255,255,0.4)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ opacity: { duration: 2.2, repeat: Infinity, delay: t(2.4) } }}
          whileTap={{ scale: 0.95 }}
        >
          Continuar
        </motion.button>
      </div>
      </div>
    </motion.div>
  );
}