import { motion } from "framer-motion";
import { useEffect } from "react";
import { OpenPortal } from "../components/OpenPortal";
import { VictoryBurst } from "../components/VictoryBurst";
import { RevealWords } from "../components/RevealWords";
import { useGameStore } from "../game/store";
import { RAZAS, type RazaId } from "../game/types";
import { audioManager } from "../audio/audioManager";

/** Texto de la pantalla final según la raza que ganó (el impacto en los demás). */
const TEXTO_VICTORIA: Record<RazaId, string> = {
  humanos:
    "Los Humanos han obtenido la inmortalidad, y con ella, una sed que nunca se apagará. Consumirán todos los recursos del mundo sin descanso, ahogarán la vida natural de los Elfos, saquearán hasta el último rincón de las minas de los Enanos y someterán a los No-Muertos a un dominio eterno, sin fin.",
  elfos:
    "La naturaleza ha despertado y ya nadie puede detenerla. Un crecimiento vegetal descontrolado sepultará las ciudades e ingenios de los Humanos, asfixiará los túneles y las minas de los Enanos, y llenará el mundo de una energía vital abrasadora, insoportable para los No-Muertos.",
  enanos:
    "Su ambición ya no conoce límites. La codicia minera y el acaparamiento de tesoros destruirán los ecosistemas sagrados de los Elfos, llevarán a la ruina a los Humanos y profanarán las tumbas y reliquias ancestrales que guardan el descanso de los No-Muertos.",
  nomuertos:
    "Su victoria significa el exterminio de los vivos: extinguiría la humanidad, masacraría las razas silvestres de los Elfos y sepultaría a los Enanos en sus propias fortalezas, transformando todo en un cementerio silencioso.",
};

const TEXTO_VICTORIA_GENERICO =
  "Las cuatro voluntades resonaron como una sola. El umbral acepta a sus viajeros.";

export function FinalScreen() {
  const irA = useGameStore((s) => s.irA);
  const ganador = useGameStore((s) => s.ganador);
  const raza = ganador ? RAZAS[ganador] : null;

  useEffect(() => {
    // Detiene cualquier música que estuviera sonando al entrar
    // en la pantalla final.
    audioManager.detenerMusica();

    // Reproduce el sonido de victoria.
    audioManager.playSfxVictoria();

    // Reproduce la narración después de un pequeño retraso.
    const t = setTimeout(() => {
      // Con ganador conocido: narracion/victoria-<raza>.mp3
      // (ej. victoria-elfos.mp3). Sin ganador: narracion/victoria.mp3.
      audioManager.playNarracion(ganador ? `victoria-${ganador}` : "victoria");
    }, 900);

    return () => clearTimeout(t);
  }, [ganador]);

  const volverAlInicio = () => {
    // Sonido del botón.
    audioManager.playSfxBoton();

    // Detiene el sonido de victoria y la narración (si seguía sonando) antes de cambiar de pantalla.
    audioManager.detenerMusica();
    audioManager.detenerNarracion();

    // Regresa al inicio.
    irA("inicio");
  };

  return (
    <div
      className="relative h-full w-full overflow-y-auto bg-noise"
      style={{ background: "var(--color-void-deep)" }}
    >
      {/* Fondo dorado triunfal — el más luminoso de toda la app */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(140% 100% at 50% 30%, #3a2f16 0%, #1c1710 45%, var(--color-void-deep) 85%)",
        }}
      />

      <VictoryBurst />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: "inset 0 0 160px 50px rgba(0,0,0,0.75)",
        }}
      />

      <div className="relative flex min-h-full w-full flex-col items-center justify-center gap-8 px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <OpenPortal />
        </motion.div>

        <div className="flex flex-col items-center gap-3">
          <h1
            className="text-center font-display text-3xl leading-tight sm:text-4xl"
            style={{
              background:
                "linear-gradient(180deg, #fff3d1 0%, var(--color-eclipse-gold) 55%, var(--color-eclipse-gold-soft) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter:
                "drop-shadow(0 2px 16px rgba(232,196,104,0.5))",
            }}
          >
            <RevealWords
              texto="El Portal se ha Abierto"
              delayStart={1.9}
              stagger={0.12}
            />
          </h1>

          {raza && (
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 2.3 }}
            >
              <img
                src={raza.logo}
                alt={`Emblema de ${raza.nombre}`}
                className="h-20 w-20 object-contain"
                style={{ filter: `drop-shadow(0 0 12px color-mix(in srgb, var(${raza.colorVar}) 70%, transparent))` }}
              />
              <p
                className="font-display text-lg tracking-wide"
                style={{ color: `var(${raza.colorVar})` }}
              >
                Han ganado los {raza.nombre}
              </p>
            </motion.div>
          )}

          <p className="max-w-md text-center text-sm text-[color:var(--color-parchment-dim)] sm:text-base">
            <RevealWords
              texto={raza ? TEXTO_VICTORIA[raza.id] : TEXTO_VICTORIA_GENERICO}
              delayStart={2.7}
              stagger={0.05}
            />
          </p>
        </div>

        <motion.button
          onClick={volverAlInicio}
          className="rounded-sm border px-9 py-3 font-display text-sm tracking-wide"
          style={{
            borderColor:
              "color-mix(in srgb, var(--color-eclipse-gold) 65%, transparent)",
            color: "var(--color-eclipse-gold)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            opacity: {
              duration: 2.2,
              repeat: Infinity,
              delay: 4.6,
            },
          }}
          whileTap={{ scale: 0.95 }}
        >
          Volver al Santuario
        </motion.button>
      </div>
    </div>
  );
}