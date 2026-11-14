import { motion } from "framer-motion";
import { useState } from "react";
import { StarField } from "../components/StarField";
import { SanctuaryScene } from "../components/SanctuaryScene";
import { RuneCircle } from "../components/RuneCircle";
import { RaceTotem } from "../components/RaceTotem";
import { Brazier } from "../components/Brazier";
import { InfoModal } from "../components/InfoModal";
import { RAZAS, ORDEN_RAZAS, MATRIZ_EFECTOS, TIPOS_EVENTO, type RazaId } from "../game/types";
import { HISTORIA_JUEGO, RAZA_DESCRIPCION, EFECTO_INFO } from "../game/lore";
import { useGameStore } from "../game/store";
import { audioManager } from "../audio/audioManager";

export function PreparationScreen() {
  const irA = useGameStore((s) => s.irA);
  const iniciarPartida = useGameStore((s) => s.iniciarPartida);
  const [historiaAbierta, setHistoriaAbierta] = useState(false);
  const [razaAbierta, setRazaAbierta] = useState<RazaId | null>(null);

  const comenzarPartida = () => {
    audioManager.playSfxBoton();
    iniciarPartida();
    irA("partida");
  };

  const abrirHistoria = () => {
    audioManager.playSfxBoton();
    setHistoriaAbierta(true);
    audioManager.playNarracion("historia");
  };

  const cerrarHistoria = () => {
    audioManager.playSfxBoton();
    audioManager.detenerNarracion();
    setHistoriaAbierta(false);
  };

  const abrirRaza = (id: RazaId) => {
    audioManager.playSfxBoton();
    setRazaAbierta(id);
    audioManager.playNarracion(`raza-${id}`);
  };

  const cerrarRaza = () => {
    audioManager.playSfxBoton();
    audioManager.detenerNarracion();
    setRazaAbierta(null);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-noise" style={{ background: "var(--color-void-deep)" }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(140% 90% at 50% 15%, #171c38 0%, var(--color-void) 55%, var(--color-void-deep) 100%)",
        }}
      />
      <StarField count={40} />
      <SanctuaryScene />
      <RuneCircle size={380} />
      <Brazier />
      <Brazier flip />

      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 140px 40px rgba(0,0,0,0.75)" }}
      />

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-none">
      <div className="relative flex min-h-full w-full flex-col items-center justify-between px-6 py-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
        >
          <h2 className="font-display text-lg tracking-wide text-[color:var(--color-parchment)] sm:text-xl">
            Cuatro pueblos ante el Portal
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-xs text-[color:var(--color-muted)] sm:text-sm">
            Cada uno arde por un deseo que es la ruina de los demás.
          </p>
          <motion.button
            onClick={abrirHistoria}
            className="mt-3 rounded-sm border px-4 py-1.5 font-display text-[11px] tracking-wide"
            style={{ borderColor: "color-mix(in srgb, var(--color-eclipse-gold) 45%, transparent)", color: "var(--color-eclipse-gold)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            whileTap={{ scale: 0.95 }}
          >
            Historia
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-2 gap-x-10 gap-y-10 sm:flex sm:gap-14">
          {ORDEN_RAZAS.map((id, i) => (
            <RaceTotem key={id} raza={RAZAS[id]} index={i} onClick={() => abrirRaza(id)} />
          ))}
        </div>

        <motion.button
          onClick={comenzarPartida}
          className="relative overflow-hidden rounded-sm border border-[color:var(--color-eclipse-gold)]/70 px-9 py-3 font-display text-sm tracking-wide text-[color:var(--color-eclipse-gold)]"
          style={{
            background: "linear-gradient(180deg, rgba(232,196,104,0.12) 0%, rgba(232,196,104,0.03) 100%)",
            boxShadow: "0 0 24px rgba(232,196,104,0.15)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          whileTap={{ scale: 0.95 }}
        >
          Comenzar la partida
        </motion.button>
      </div>
      </div>

      {/* Modal: Historia del juego */}
      <InfoModal open={historiaAbierta} onClose={cerrarHistoria}>
        <h3 className="mb-4 text-center font-display text-lg tracking-wide text-[color:var(--color-eclipse-gold)]">
          El Reino de la Noche Eterna
        </h3>
        <div className="space-y-3 text-sm leading-relaxed text-[color:var(--color-parchment)]">
          {HISTORIA_JUEGO.split("\n\n").map((parrafo, i) => (
            <p key={i}>{parrafo}</p>
          ))}
        </div>
      </InfoModal>

      {/* Modal: descripción de una raza + qué le afecta */}
      <InfoModal open={razaAbierta !== null} onClose={cerrarRaza}>
        {razaAbierta && (
          <>
            <div className="mb-3 flex flex-col items-center gap-2">
              <img src={RAZAS[razaAbierta].logo} alt={RAZAS[razaAbierta].nombre} className="h-16 w-16 object-contain" />
              <h3 className="font-display text-lg tracking-wide" style={{ color: `var(${RAZAS[razaAbierta].colorVar})` }}>
                {RAZAS[razaAbierta].nombre}
              </h3>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-[color:var(--color-parchment)]">
              {RAZA_DESCRIPCION[razaAbierta]}
            </p>
            <p className="mb-2 text-xs tracking-wide text-[color:var(--color-muted)]">
              Cómo le afecta cada tipo de evento
            </p>
            <div className="space-y-2">
              {(Object.keys(TIPOS_EVENTO) as (keyof typeof TIPOS_EVENTO)[]).map((tipo) => {
                const efecto = MATRIZ_EFECTOS[razaAbierta][tipo];
                const info = EFECTO_INFO[efecto];
                return (
                  <div key={tipo} className="flex items-center justify-between border-b border-white/10 pb-2 text-sm">
                    <span className="flex items-center gap-2 text-[color:var(--color-parchment)]">
                      <span>{TIPOS_EVENTO[tipo].icono}</span>
                      {TIPOS_EVENTO[tipo].nombre}
                    </span>
                    <span className="text-xs font-medium" style={{ color: info.color }}>
                      {info.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </InfoModal>
    </div>
  );
}