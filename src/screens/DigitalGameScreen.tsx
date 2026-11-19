import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StarField } from "../components/StarField";
import { InfoModal } from "../components/InfoModal";
import { Board } from "../components/digital/Board";
import { Dado } from "../components/digital/Dice";
import { EventOverlay } from "../components/digital/EventOverlay";
import { RAZAS } from "../game/types";
import { useGameStore } from "../game/store";
import { useDigitalStore } from "../game/digital/store";
import { COLOR_TABLERO, REL_META_INI } from "../game/digital/board";
import {
  BONO_CAPTURA,
  fichasDe,
  jugadorActual,
  movimientosLegales,
  premioActual,
  puedeSacar,
  salidaBloqueada,
  type Movimiento,
} from "../game/digital/engine";
import { elegirAccion } from "../game/digital/bot";
import { audioManager } from "../audio/audioManager";
import { useAjustes } from "../game/ajustes";
import { useOnline } from "../game/online/conexion";

const RETRASO_IA = 850;

export function DigitalGameScreen() {
  const partida = useDigitalStore((s) => s.partida);
  const { tirar, sacar, mover, cerrarEvento, abandonar, modo, misRazas, nombres } = useDigitalStore();
  const enLinea = modo === "online";
  const irA = useGameStore((s) => s.irA);
  const partidaTerminada = useGameStore((s) => s.partidaTerminada);

  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [eventoVisible, setEventoVisible] = useState(false);
  const [salirAbierto, setSalirAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  /** En línea: evento que este jugador ya cerró en su pantalla (lo cierra de verdad quien tiene el turno). */
  const [eventoOculto, setEventoOculto] = useState<number | null>(null);

  useEffect(() => {
    audioManager.playMusicaAmbiental("/audio/musica/partida-loop.mp3", 0.3);
  }, []);

  // Sin partida (p. ej. al recargar) → volver a la configuración.
  // Solo al abrir la pantalla: al salir a propósito la partida también queda vacía
  // mientras la pantalla se desvanece, y eso no debe cambiar a dónde se va.
  useEffect(() => {
    if (!useDigitalStore.getState().partida) irA(useDigitalStore.getState().modo === "online" ? "online" : "configDigital");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fase = partida?.fase;
  const turnoIdx = partida?.turno;

  // La revelación del evento espera a que las fichas terminen de moverse.
  useEffect(() => {
    if (fase !== "evento") {
      setEventoVisible(false);
      return;
    }
    // En modo rápido el evento aparece antes (todo dura menos de 3 s).
    const espera = useAjustes.getState().modoEventos === "saltar" ? 600 : 1100;
    const t = setTimeout(() => setEventoVisible(true), espera);
    return () => clearTimeout(t);
  }, [fase]);

  // Victoria → pantalla final de la app.
  useEffect(() => {
    if (fase !== "fin" || !partida?.ganador) return;
    const g = partida.ganador;
    const t = setTimeout(() => {
      partidaTerminada(g);
      // En línea la sala ya no hace falta.
      if (enLinea) useOnline.getState().salir();
    }, 1800);
    return () => clearTimeout(t);
  }, [fase, partida?.ganador, partidaTerminada, enLinea]);

  // Avisos breves
  useEffect(() => {
    if (!partida?.aviso) return;
    setAviso(partida.aviso.texto);
    const t = setTimeout(() => setAviso(null), 2400);
    return () => clearTimeout(t);
  }, [partida?.aviso]);

  // Se limpia la selección cuando cambia el turno o la fase.
  useEffect(() => setSeleccion(null), [turnoIdx, fase, partida?.usados]);

  // Turnos de la máquina
  const jugador = partida ? jugadorActual(partida) : null;
  const esIA = jugador?.tipo === "ia";
  /** ¿Este dispositivo controla el turno actual? (en local, cualquier jugador humano) */
  const esMio = !enLinea || (!!jugador && misRazas.includes(jugador.raza));
  const puedoJugar = !esIA && esMio;
  const nombreTurno = jugador ? (nombres[jugador.raza] ?? "Jugador") : "";
  const ajustesAbiertos = useAjustes((s) => s.panelAbierto);
  const reglasAbiertas = useAjustes((s) => s.reglasAbiertas);
  const abrirReglas = useAjustes((s) => s.abrirReglas);
  useEffect(() => {
    // En línea las máquinas las mueve el servidor.
    if (!partida || !esIA || enLinea || reglasAbiertas || salirAbierto || ajustesAbiertos) return;
    if (partida.fase !== "tirar" && partida.fase !== "mover" && partida.fase !== "bono") return;
    const t = setTimeout(() => {
      const accion = elegirAccion(partida);
      if (!accion) return;
      if (accion.tipo === "tirar") tirar();
      else if (accion.tipo === "sacar") sacar();
      else mover(accion.fichaId, accion.opcion);
    }, partida.fase === "tirar" ? RETRASO_IA : RETRASO_IA + 250);
    return () => clearTimeout(t);
  }, [partida, esIA, enLinea, reglasAbiertas, salirAbierto, ajustesAbiertos, tirar, sacar, mover]);

  const movs = useMemo(() => (partida ? movimientosLegales(partida) : []), [partida]);
  const movibles = useMemo(() => (puedoJugar ? new Set(movs.map((m) => m.fichaId)) : new Set<string>()), [movs, puedoJugar]);
  const sacarDisponible = !!partida && puedoJugar && puedeSacar(partida);

  // Premio por comer: si solo una ficha puede usarlo, se mueve sola.
  const bonoUnico = partida?.fase === "bono" && puedoJugar && movs.length === 1 ? movs[0] : null;
  useEffect(() => {
    if (!bonoUnico || reglasAbiertas || salirAbierto || ajustesAbiertos) return;
    const t = setTimeout(() => mover(bonoUnico.fichaId, bonoUnico.opcion), 900);
    return () => clearTimeout(t);
  }, [bonoUnico, reglasAbiertas, salirAbierto, ajustesAbiertos, mover]);

  // La crónica siempre muestra lo último que pasó.
  const cronicaRef = useRef<HTMLDivElement>(null);
  const ultimoLog = partida?.log[partida.log.length - 1]?.id;
  useEffect(() => {
    const el = cronicaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ultimoLog]);

  if (!partida || !jugador) return null;

  const raza = jugador.raza;
  const color = COLOR_TABLERO[raza];
  const destinos = seleccion ? movs.filter((m) => m.fichaId === seleccion) : [];

  const moverA = (m: Movimiento) => {
    audioManager.playSfxBoton();
    setSeleccion(null);
    mover(m.fichaId, m.opcion);
  };

  const onFicha = (id: string) => {
    if (!puedoJugar) return;
    const f = partida.fichas.find((x) => x.id === id);
    if (!f) return;
    if (f.rel === null && f.raza === raza && sacarDisponible) {
      audioManager.playSfxBoton();
      sacar();
      return;
    }
    if (!movibles.has(id)) return;
    const opciones = movs.filter((m) => m.fichaId === id);
    // Con una sola opción de dados, la ficha va directo a su casilla.
    if (opciones.length === 1) {
      moverA(opciones[0]);
      return;
    }
    audioManager.playSfxBoton();
    setSeleccion((s) => (s === id ? null : id));
  };

  const lanzar = () => {
    audioManager.playSfxBoton();
    tirar();
  };

  const confirmarSalida = () => {
    audioManager.playSfxBoton();
    if (enLinea) useOnline.getState().salir();
    else abandonar();
    irA("inicio");
  };

  let pista = "";
  if (!esIA && !esMio && partida.fase !== "evento" && partida.fase !== "fin") {
    pista = `Esperando a ${nombreTurno}…`;
  } else if (partida.fase === "tirar") {
    pista = esIA
      ? "La máquina está lanzando…"
      : !fichasDe(partida, raza).some((f) => f.rel !== null && f.rel < REL_META_INI)
        ? `Necesitas un 5 (en un dado o sumando) para sacar fichas · ${partida.intentos} ${partida.intentos === 1 ? "intento" : "intentos"}.`
        : "Lanza los dados.";
  } else if (partida.fase === "mover") {
    if (esIA) pista = "La máquina está pensando…";
    else if (sacarDisponible && movs.length) pista = "Toca tu base para sacar una ficha con el 5, o una ficha brillante para moverla.";
    else if (sacarDisponible) pista = "¡Un 5! Toca tu base para sacar una ficha.";
    else if (salidaBloqueada(partida)) pista = "Tu Salida está llena: mueve primero con el otro dado y luego podrás sacar con el 5.";
    else if (seleccion) pista = "Elige a qué casilla moverla (el número es lo que avanza).";
    else pista = "Toca una ficha brillante para moverla.";
  } else if (partida.fase === "bono") {
    const premio = premioActual(partida);
    const motivo = premio?.motivo === "meta" ? "¡Premio por llegar al carril final!" : "¡Premio por comer!";
    const valor = premio?.valor ?? BONO_CAPTURA;
    pista = esIA
      ? "La máquina cobra su premio…"
      : bonoUnico
        ? `${motivo} Tu ficha avanza ${valor} casillas.`
        : `${motivo} Toca la ficha que quieres avanzar ${valor} casillas.`;
  } else if (partida.fase === "evento") pista = "El Portal se agita…";

  const dadosMostrados = partida.dados
    ? { orig: partida.dadosOriginales!, ef: partida.dados, usados: partida.usados, actual: true }
    : partida.ultimaTirada
      ? { orig: partida.ultimaTirada.orig, ef: partida.ultimaTirada.efectivos, usados: [true, true] as [boolean, boolean], actual: false }
      : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-noise" style={{ background: "var(--color-void-deep)" }}>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 100% at 50% 40%, #221a3a 0%, #120d26 50%, var(--color-void-deep) 90%)" }}
      />
      <StarField count={18} />

      <div className="relative flex h-full w-full flex-col landscape:flex-row">
        {/* Tablero (en vertical deja libre la franja de arriba para los controles de la esquina) */}
        <div
          className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-2 portrait:pt-14 landscape:p-3 sm:portrait:pt-[4.5rem]"
          style={{ containerType: "size" }}
        >
          <div style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}>
            <Board
              fichas={partida.fichas}
              razasEnJuego={partida.jugadores.map((j) => j.raza)}
              turno={raza}
              movibles={movibles}
              seleccion={seleccion}
              destinos={destinos}
              baseActiva={sacarDisponible}
              derrumbes={partida.derrumbes}
              onFicha={onFicha}
              onDestino={moverA}
              onBase={() => {
                audioManager.playSfxBoton();
                sacar();
              }}
            />
          </div>
        </div>

        {/* Panel de control */}
        <div className="flex shrink-0 flex-col gap-3 px-4 pb-4 pt-1 landscape:w-80 landscape:justify-center landscape:pb-4 landscape:pt-16 sm:landscape:pt-20 lg:landscape:w-96">
          <div className="flex items-center justify-between gap-2">
            <motion.div
              key={`${partida.turno}`}
              className="flex min-w-0 items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <img src={RAZAS[raza].logo} alt="" className="h-9 w-9 shrink-0 object-contain" style={{ filter: `drop-shadow(0 0 6px ${color.base})` }} />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Turno de</p>
                <p className="truncate font-display text-base leading-tight tracking-wide" style={{ color: color.claro }}>
                  {RAZAS[raza].nombre}
                </p>
                <p className="text-[11px] text-[color:var(--color-muted)]">
                  {esIA ? "🤖 Máquina" : enLinea ? `👤 ${nombreTurno}${esMio ? " (tú)" : ""}` : "👤 Jugador"}
                  {jugador.maldicion > 0 && ` · 🐸 Sapo (${jugador.maldicion})`}
                </p>
              </div>
            </motion.div>
            <div className="flex shrink-0 gap-1.5">
              <BotonChico onClick={() => abrirReglas(true)}>Reglas</BotonChico>
              <BotonChico onClick={() => setSalirAbierto(true)}>Salir</BotonChico>
            </div>
          </div>

          <div
            className="flex items-center gap-3 rounded-md border px-3 py-3"
            style={{ borderColor: `color-mix(in srgb, ${color.base} 45%, transparent)`, background: "rgba(10,12,24,0.6)" }}
          >
            <div className="flex gap-2" style={{ opacity: dadosMostrados?.actual ? 1 : 0.55 }}>
              {[0, 1].map((i) => (
                <Dado
                  key={i}
                  valor={dadosMostrados?.orig[i] ?? null}
                  efectivo={dadosMostrados?.ef[i] ?? null}
                  usado={!!dadosMostrados?.actual && dadosMostrados.usados[i]}
                  tirada={partida.ultimaTirada?.n ?? 0}
                  color={COLOR_TABLERO[partida.ultimaTirada?.raza ?? raza].base}
                />
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {partida.fase === "tirar" && puedoJugar ? (
                <motion.button
                  onClick={lanzar}
                  className="rounded-sm border px-4 py-2.5 font-display text-sm tracking-wide"
                  style={{ borderColor: color.claro, color: "#fff6e6", background: `linear-gradient(180deg, ${color.base}, ${color.oscuro})` }}
                  animate={{ boxShadow: [`0 0 0px ${color.base}`, `0 0 18px ${color.base}`, `0 0 0px ${color.base}`] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  whileTap={{ scale: 0.95 }}
                >
                  Lanzar dados
                </motion.button>
              ) : null}
              <p className="text-xs leading-snug text-[color:var(--color-parchment-dim)]">{pista}</p>
            </div>
          </div>

          {/* Marcador */}
          <div className="grid grid-cols-4 gap-1.5">
            {partida.jugadores.map((j, i) => {
              const fs = fichasDe(partida, j.raza);
              const meta = fs.filter((f) => f.rel !== null && f.rel >= REL_META_INI).length;
              const base = fs.filter((f) => f.rel === null).length;
              const activo = i === partida.turno;
              return (
                <div
                  key={j.raza}
                  className="flex flex-col items-center rounded-sm border py-1.5"
                  style={{
                    borderColor: activo ? COLOR_TABLERO[j.raza].claro : "rgba(255,255,255,0.08)",
                    background: activo ? `color-mix(in srgb, ${COLOR_TABLERO[j.raza].base} 18%, transparent)` : "transparent",
                  }}
                >
                  <img src={RAZAS[j.raza].logo} alt={RAZAS[j.raza].nombre} className="h-6 w-6 object-contain" />
                  <span className="mt-0.5 text-[10px] text-[color:var(--color-parchment-dim)]">
                    ⌂{base} · ✦{meta}/4
                  </span>
                </div>
              );
            })}
          </div>

          {/* Crónica */}
          <div
            ref={cronicaRef}
            className="hidden max-h-40 flex-col overflow-y-auto rounded-sm border border-white/5 bg-black/20 px-2 py-1.5 landscape:flex sm:flex"
          >
            {partida.log.slice(-30).map((e) => (
              <p key={e.id} className="py-0.5 text-[11px] leading-snug" style={{ color: e.raza ? COLOR_TABLERO[e.raza].claro : "var(--color-muted)" }}>
                {e.texto}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Aviso flotante */}
      <AnimatePresence>
        {aviso && (
          <motion.div
            key={aviso}
            className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-white/15 bg-black/75 px-4 py-2 text-center text-xs text-[color:var(--color-parchment)]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {aviso}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {eventoVisible && partida.eventoActual && eventoOculto !== partida.contador && (
          <EventOverlay
            key={partida.contador}
            resultado={partida.eventoActual}
            onContinuar={() => {
              // En línea solo quien tiene el turno cierra el evento para todos; los demás lo ocultan en su pantalla.
              if (enLinea && !puedoJugar) setEventoOculto(partida.contador);
              else cerrarEvento();
            }}
          />
        )}
      </AnimatePresence>


      <InfoModal open={salirAbierto} onClose={() => setSalirAbierto(false)}>
        <h3 className="mb-3 text-center font-display text-lg text-[color:var(--color-eclipse-gold)]">¿Abandonar la partida?</h3>
        <p className="text-center text-sm text-[color:var(--color-parchment-dim)]">
          {enLinea ? "Saldrás de la sala y una máquina jugará por ti." : "Se perderá el progreso de esta partida."}
        </p>
        <button
          onClick={confirmarSalida}
          className="mt-5 w-full rounded-sm border border-red-400/50 px-4 py-2 font-display text-xs tracking-wide text-red-300"
        >
          Sí, salir al inicio
        </button>
      </InfoModal>
    </div>
  );
}

function BotonChico({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={() => {
        audioManager.playSfxBoton();
        onClick();
      }}
      className="rounded-sm border border-white/15 px-2.5 py-1 font-display text-[11px] tracking-wide text-[color:var(--color-parchment-dim)] sm:px-3 sm:py-1.5 sm:text-xs lg:px-4 lg:py-2 lg:text-sm"
    >
      {children}
    </button>
  );
}
