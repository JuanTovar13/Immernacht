import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { OpenPortal } from "../components/OpenPortal";
import { VictoryBurst } from "../components/VictoryBurst";
import { FondoVictoria } from "../components/VictoriaRaza";
import { RevealWords } from "../components/RevealWords";
import { useGameStore } from "../game/store";
import { RAZAS, type Raza, type RazaId } from "../game/types";
import { audioManager } from "../audio/audioManager";
import { useOnline } from "../game/online/conexion";

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

  // El letrero de ¡VICTORIA! dura un momento y da paso a la tarjeta del ganador.
  const [mostrarLetrero, setMostrarLetrero] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setMostrarLetrero(false), 2300);
    return () => clearTimeout(t);
  }, []);

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

  const origen = useGameStore((s) => s.origenFinal);

  /** Corta el sonido de victoria y la narración (si seguía sonando) y cambia de pantalla. */
  const irDesdeFinal = (destino: Parameters<typeof irA>[0]) => {
    audioManager.playSfxBoton();
    audioManager.detenerMusica();
    audioManager.detenerNarracion();
    irA(destino);
  };

  const volverAlInicio = () => {
    // En línea, salir al inicio también es dejar la sala.
    if (origen === "online") useOnline.getState().salir();
    irDesdeFinal("inicio");
  };

  /** En línea: de vuelta a la selección de razas de la misma sala. */
  const regresarASala = () => {
    const o = useOnline.getState();
    if (!o.sala && o.salaGuardada) o.unirse(o.salaGuardada);
    irDesdeFinal("online");
  };

  const otraPartida = origen === "online" ? { texto: "Regresar a la sala", accion: regresarASala } : origen === "digital" ? { texto: "Volver a jugar", accion: () => irDesdeFinal("configDigital") } : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-noise" style={{ background: "var(--color-void-deep)" }}>
      {/* Capa de fondo con su propio recorte: las ondas del sol nunca agrandan
          el área de scroll ni mueven la pantalla. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Fondo de la raza ganadora (su ambiente y sus partículas, según su texto final) */}
        {ganador ? (
          <FondoVictoria raza={ganador} />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(140% 100% at 50% 30%, #3a2f16 0%, #1c1710 45%, var(--color-void-deep) 85%)" }}
            />
            <VictoryBurst />
          </>
        )}
        <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 160px 50px rgba(0,0,0,0.75)" }} />
      </div>

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
      <div className="relative flex min-h-full w-full flex-col items-center justify-center gap-8 px-6 py-10">
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <OpenPortal />

          {/* Primero el letrero de ¡VICTORIA!, que da paso a la tarjeta del ganador */}
          <AnimatePresence>
            {mostrarLetrero && (
              <motion.div
                key="letrero"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.6, filter: "blur(6px)" }}
                transition={{ duration: 0.6, ease: "backOut" }}
              >
                <span
                  className="whitespace-nowrap font-display text-5xl font-bold tracking-[0.08em] sm:text-6xl"
                  style={{
                    color: "#fffaf0",
                    WebkitTextStroke: "1.5px #6b4a10",
                    textShadow: "0 0 18px rgba(255,236,170,0.95), 0 0 42px rgba(232,196,104,0.85), 0 4px 0 #8a5d12",
                  }}
                >
                  ¡VICTORIA!
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {raza && !mostrarLetrero && <TarjetaGanador raza={raza} texto={TEXTO_VICTORIA[raza.id]} />}
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
              filter: "drop-shadow(0 2px 16px rgba(232,196,104,0.5))",
            }}
          >
            <RevealWords texto="El Portal se ha Abierto" delayStart={3.1} stagger={0.12} />
          </h1>

          {/* Con ganador, su texto está al reverso de la tarjeta; sin ganador, va aquí. */}
          {!raza && (
            <p className="max-w-md text-center text-sm text-[color:var(--color-parchment-dim)] sm:text-base">
              <RevealWords texto={TEXTO_VICTORIA_GENERICO} delayStart={3.8} stagger={0.05} />
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {otraPartida && (
            <motion.button
              onClick={otraPartida.accion}
              className="rounded-sm border px-9 py-3 font-display text-sm tracking-wide"
              style={{
                borderColor: "color-mix(in srgb, var(--color-eclipse-gold) 65%, transparent)",
                color: "#1a1206",
                background: "linear-gradient(180deg, #f3d98a, var(--color-eclipse-gold))",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ opacity: { duration: 0.6, delay: 5.6 } }}
              whileTap={{ scale: 0.95 }}
            >
              {otraPartida.texto}
            </motion.button>
          )}
          <motion.button
            onClick={volverAlInicio}
            className="rounded-sm border px-9 py-3 font-display text-sm tracking-wide"
            style={{
              borderColor:
                "color-mix(in srgb, var(--color-eclipse-gold) 65%, transparent)",
              color: "var(--color-eclipse-gold)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: otraPartida ? 1 : [0.6, 1, 0.6] }}
            transition={{
              opacity: otraPartida
                ? { duration: 0.6, delay: 5.6 }
                : {
                    duration: 2.2,
                    repeat: Infinity,
                    delay: 5.6,
                  },
            }}
            whileTap={{ scale: 0.95 }}
          >
            Volver al Santuario
          </motion.button>
        </div>
      </div>
      </div>
    </div>
  );
}

/** Tarjeta del ganador: al tocarla se da la vuelta y muestra el texto de su victoria. */
function TarjetaGanador({ raza, texto }: { raza: Raza; texto: string }) {
  const [volteada, setVolteada] = useState(false);
  const cara = {
    borderColor: `var(${raza.colorVar})`,
    background: "linear-gradient(180deg, rgba(20,16,10,0.94), rgba(8,8,16,0.96))",
    boxShadow: `0 0 0 4px rgba(232,196,104,0.35), 0 0 38px color-mix(in srgb, var(${raza.colorVar}) 65%, transparent), 0 12px 30px rgba(0,0,0,0.6)`,
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
  };

  return (
    <motion.div
      className="absolute w-56 sm:w-64"
      style={{ perspective: 900 }}
      initial={{ opacity: 0, scale: 0.6, rotateX: 50 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ duration: 0.7, ease: "backOut" }}
    >
      <motion.button
        type="button"
        onClick={() => {
          audioManager.playSfxBoton();
          setVolteada((v) => !v);
        }}
        aria-label={volteada ? "Ver el emblema" : "Leer lo que significa esta victoria"}
        className="relative block w-full cursor-pointer text-left"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: volteada ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Anverso: emblema y nombre (define el tamaño de la tarjeta) */}
        <div className="flex min-h-[17rem] flex-col items-center justify-center gap-1.5 rounded-lg border-2 px-5 py-5" style={cara}>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-eclipse-gold)]">Victoria</span>
          <motion.img
            src={raza.logo}
            alt={`Emblema de ${raza.nombre}`}
            className="h-24 w-24 object-contain sm:h-28 sm:w-28"
            style={{ filter: `drop-shadow(0 0 14px color-mix(in srgb, var(${raza.colorVar}) 80%, transparent))` }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <p className="text-center font-display text-2xl leading-tight tracking-wide" style={{ color: `var(${raza.colorVar})` }}>
            {raza.nombre}
          </p>
          <p className="text-center text-xs text-[color:var(--color-parchment-dim)]">han abierto el Portal</p>
          <motion.span
            className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-eclipse-gold)]"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            Toca para leer ↻
          </motion.span>
        </div>

        {/* Reverso: el texto de la victoria */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto rounded-lg border-2 px-4 py-4"
          style={{ ...cara, transform: "rotateY(180deg)" }}
        >
          <img src={raza.logo} alt="" className="h-8 w-8 shrink-0 object-contain opacity-80" />
          <p className="text-center text-[12px] leading-snug text-[color:var(--color-parchment)] sm:text-[13px]">{texto}</p>
        </div>
      </motion.button>
    </motion.div>
  );
}
