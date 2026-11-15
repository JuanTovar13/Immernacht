import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { StarField } from "../components/StarField";
import { NebulaDrift } from "../components/NebulaDrift";
import { ArcaneVortex } from "../components/ArcaneVortex";
import { RAZAS, ORDEN_RAZAS } from "../game/types";
import { useGameStore } from "../game/store";
import { audioManager } from "../audio/audioManager";
import { arduinoConnection } from "../hardware/arduinoConnection";

const IP_ARDUINO_GUARDADA = "arduino-ip";

export function GameScreen() {
  const activarEvento = useGameStore((s) => s.activarEvento);
  const turnoActual = useGameStore((s) => s.turnoActual);
  const [ip, setIp] = useState(() => localStorage.getItem(IP_ARDUINO_GUARDADA) ?? "");
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    audioManager.playMusicaAmbiental("/audio/musica/partida-loop.mp3", 0.3);
  }, []);

  useEffect(() => {
    // Si ya guardaste una IP antes, se reconecta solo cada vez que entras a la Partida.
    if (ip) {
      arduinoConnection.iniciar(ip);
      setConectado(true);
    }
    return () => arduinoConnection.detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conectarArduino = () => {
    localStorage.setItem(IP_ARDUINO_GUARDADA, ip);
    arduinoConnection.iniciar(ip);
    setConectado(true);
  };

  const invocarEvento = () => {
    audioManager.playSfxActivarEvento();
    activarEvento();
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-noise" style={{ background: "var(--color-void-deep)" }}>
      {/* Fondo: energía arcana activa, muy distinto del cielo calmo de antes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 50%, #241a3c 0%, #150f2c 45%, var(--color-void-deep) 85%)",
        }}
      />
      <StarField count={22} />
      <NebulaDrift />

      {/* Eclipse distante en el cielo — ya no protagonista, solo contexto */}
      <div className="absolute left-1/2 top-[4%] -translate-x-1/2 opacity-70" style={{ transform: "translateX(-50%) scale(0.32)" }}>
        <div className="relative h-44 w-44">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 38% 32%, #fff3d1 0%, var(--color-eclipse-gold) 45%, var(--color-eclipse-gold-soft) 100%)",
              boxShadow: "0 0 30px 6px rgba(232,196,104,0.4)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              inset: 0,
              transform: "translateX(14%)",
              background: "radial-gradient(circle at 35% 30%, #1c2140, #05070f)",
            }}
          />
        </div>
      </div>

      {/* Grietas de runas incandescentes en el suelo, convergiendo al centro */}
      <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[45%] w-full opacity-50">
        <g stroke="var(--arcano-bright)" strokeWidth="0.6" fill="none">
          <motion.path d="M0,300 L150,190" animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />
          <motion.path d="M400,300 L250,190" animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 3.4, repeat: Infinity, delay: 0.5 }} />
          <motion.path d="M60,300 L170,200" animate={{ opacity: [0.15, 0.5, 0.15] }} transition={{ duration: 2.6, repeat: Infinity, delay: 1 }} />
          <motion.path d="M340,300 L230,200" animate={{ opacity: [0.15, 0.5, 0.15] }} transition={{ duration: 2.8, repeat: Infinity, delay: 1.3 }} />
        </g>
      </svg>

      {/* Borde de piedra del tablero físico */}
      <div className="absolute inset-x-0 bottom-0 h-[10%]" style={{ background: "linear-gradient(180deg, transparent 0%, #05070f 60%)" }} />
      <svg viewBox="0 0 400 30" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[6%] w-full">
        <rect width="400" height="30" fill="#05070f" />
        <rect width="400" height="2" fill="var(--arcano-bright)" opacity="0.3" />
      </svg>

      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 150px 45px rgba(0,0,0,0.8)" }} />

      {/* HUD */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-none">
      <div className="relative flex min-h-full w-full flex-col items-center justify-between px-6 py-8">
        <motion.div
          key={turnoActual}
          className="flex items-center gap-2 border border-[color:var(--color-border)] bg-[color:var(--color-panel)]/70 px-4 py-2 backdrop-blur-sm"
          style={{ clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0% 100%)" }}
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src={RAZAS[turnoActual].logo}
            alt={`Emblema de ${RAZAS[turnoActual].nombre}`}
            className="h-6 w-6 object-contain"
            style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, var(${RAZAS[turnoActual].colorVar}) 65%, transparent))` }}
          />
          <span className="font-display text-xs tracking-wide text-[color:var(--color-parchment)] sm:text-sm">
            Turno de los {RAZAS[turnoActual].nombre}
          </span>
        </motion.div>

        {/* Botón principal, con el vórtice arcano como fondo dramático */}
        <div className="relative flex flex-col items-center">
          <ArcaneVortex size={360} />
          <motion.button
            onClick={invocarEvento}
            className="relative flex h-40 w-40 items-center justify-center rounded-full sm:h-48 sm:w-48"
            style={{
              background: "radial-gradient(circle at 35% 30%, #3a2452 0%, #1d1338 55%, #0d0a1c 100%)",
              border: "2px solid var(--color-eclipse-gold)",
            }}
            animate={{
              boxShadow: [
                "0 0 50px 10px rgba(178,127,232,0.35), inset 0 0 30px rgba(232,196,104,0.15)",
                "0 0 70px 16px rgba(178,127,232,0.5), inset 0 0 40px rgba(232,196,104,0.25)",
                "0 0 50px 10px rgba(178,127,232,0.35), inset 0 0 30px rgba(232,196,104,0.15)",
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            whileTap={{ scale: 0.94 }}
          >
            <span className="px-4 text-center font-display text-base tracking-wide text-[color:var(--color-eclipse-gold)] sm:text-lg">
              Invocar
              <br />
              Evento
            </span>
          </motion.button>
        </div>

        <motion.div
          className="flex items-end gap-5 sm:gap-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          {ORDEN_RAZAS.map((id) => {
            const esTurnoActual = id === turnoActual;
            return (
              <motion.div
                key={id}
                className="flex flex-col items-center gap-1"
                animate={{ opacity: esTurnoActual ? 1 : 0.35, scale: esTurnoActual ? 1.25 : 1 }}
                transition={{ duration: 0.4 }}
              >
                {esTurnoActual && (
                  <motion.div
                    className="absolute h-8 w-8 rounded-full sm:h-9 sm:w-9"
                    style={{ background: `radial-gradient(circle, color-mix(in srgb, var(${RAZAS[id].colorVar}) 45%, transparent) 0%, transparent 70%)` }}
                    animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <img
                  src={RAZAS[id].logo}
                  alt={`Emblema de ${RAZAS[id].nombre}`}
                  className="h-7 w-7 object-contain"
                  style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, var(${RAZAS[id].colorVar}) 65%, transparent))` }}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Panel de conexión con el Arduino — discreto, en la esquina superior izquierda
            (la derecha es para los controles de sonido y ajustes) */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1 sm:left-5 sm:top-5">
          <div className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: conectado ? "#8fbf6a" : "rgba(255,255,255,0.25)" }}
            />
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="IP o URL de ngrok"
              className="w-40 border border-white/10 bg-transparent px-1.5 py-0.5 text-[10px] text-white/50 placeholder:text-white/25"
            />
            <button
              onClick={conectarArduino}
              className="rounded-sm border border-white/10 px-2 py-0.5 text-[10px] text-white/40"
            >
              Conectar
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}