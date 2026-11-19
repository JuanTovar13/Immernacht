import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { StarField } from "../components/StarField";
import { SanctuaryScene } from "../components/SanctuaryScene";
import { EclipseEmblem } from "../components/EclipseEmblem";
import { ParticleField } from "../components/ParticleField";
import { BotonInstalar } from "../components/BotonInstalar";
import { useGameStore } from "../game/store";
import { audioManager } from "../audio/audioManager";

export function IntroScreen() {
  const irA = useGameStore((s) => s.irA);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const iniciarMusica = () => audioManager.playMusicaAmbiental("/audio/musica/intro-loop.mp3");

    // Intento inmediato: si el navegador ya permite audio (p. ej. tras recargar
    // la página en la misma sesión), empieza sin esperar nada más.
    iniciarMusica();

    // Si el navegador lo bloqueó (lo normal en la primera visita), el primer
    // toque en CUALQUIER parte de esta pantalla la dispara — no hace falta
    // esperar a que aparezca el botón "Tocar para comenzar".
    window.addEventListener("pointerdown", iniciarMusica, { once: true });

    const t = setTimeout(() => setListo(true), 2600);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", iniciarMusica);
    };
  }, []);

  const comenzar = () => {
    audioManager.playSfxBoton();
    irA("preparacion");
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-noise" style={{ background: "var(--color-void-deep)" }}>
      {/* Cielo de fondo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(140% 80% at 50% 20%, #1a2040 0%, var(--color-void) 50%, var(--color-void-deep) 100%)",
        }}
      />
      <StarField count={70} />
      <ParticleField color="var(--color-eclipse-gold)" count={14} />

      {/* Escenario: montañas, ruinas y suelo del Santuario Atávico */}
      <SanctuaryScene />

      {/* Viñeta para enmarcar y dar profundidad de "pantalla de juego" */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: "inset 0 0 140px 40px rgba(0,0,0,0.75)",
        }}
      />

      {/* Contenido central */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-none">
      <div className="relative flex min-h-full w-full flex-col items-center justify-center px-6">
        <div className="mb-6">
          <EclipseEmblem />
        </div>

        <motion.h1
          className="text-center text-4xl leading-none tracking-wide sm:text-5xl"
          style={{
            fontFamily: "var(--font-decorative)",
            background:
              "linear-gradient(180deg, #fff3d1 0%, var(--color-eclipse-gold) 55%, var(--color-eclipse-gold-soft) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 2px 14px rgba(232,196,104,0.4))",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.7 }}
        >
          Immernacht
        </motion.h1>

        <motion.p
          className="mt-2 text-center font-display text-sm tracking-[0.2em] text-[color:var(--color-parchment-dim)] sm:text-base"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2.0 }}
        >
          El Reino de la Noche Eterna
        </motion.p>

        <motion.p
          className="mt-4 max-w-xs text-center text-sm text-[color:var(--color-muted)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.5 }}
        >
          Solo una noche en el siglo se abre el Portal del Eclipse en el Santuario Atávico.
        </motion.p>

        {/* El espacio del botón está reservado desde el inicio para que nada salte al aparecer. */}
        <div className="mt-10 flex h-12 items-center justify-center">
        {listo && (
          <motion.button
            onClick={comenzar}
            className="relative overflow-hidden rounded-sm border border-[color:var(--color-eclipse-gold)]/70 px-9 py-3 font-display text-sm tracking-wide text-[color:var(--color-eclipse-gold)]"
            style={{
              background:
                "linear-gradient(180deg, rgba(232,196,104,0.12) 0%, rgba(232,196,104,0.03) 100%)",
              boxShadow: "0 0 24px rgba(232,196,104,0.15)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{ opacity: { duration: 2.2, repeat: Infinity } }}
            whileTap={{ scale: 0.95 }}
          >
            Tocar para comenzar
          </motion.button>
        )}
        </div>

        {/* Visible desde que se entra: se puede instalar sin esperar la animación del título. */}
        <div className="mt-6">
          <BotonInstalar />
        </div>
      </div>
      </div>
    </div>
  );
}
