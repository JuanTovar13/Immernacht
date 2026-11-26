import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StarField } from "../components/StarField";
import { RAZAS, ORDEN_RAZAS, type RazaId } from "../game/types";
import { useGameStore } from "../game/store";
import { COLOR_TABLERO } from "../game/digital/board";
import { useOnline } from "../game/online/conexion";
import { LARGO_CODIGO, SEGUNDOS_CUENTA, codigoValido, type Asiento, type VistaSala } from "../game/online/protocolo";
import { audioManager } from "../audio/audioManager";

/** Código que llegó en el enlace (?sala=ABCD), si lo hay. */
let codigoDelEnlace: string | null = null;
export function leerCodigoDelEnlace(): boolean {
  try {
    const url = new URL(window.location.href);
    const c = url.searchParams.get("sala")?.toUpperCase() ?? null;
    if (c && codigoValido(c)) {
      codigoDelEnlace = c;
      url.searchParams.delete("sala");
      window.history.replaceState(null, "", url.toString());
      return true;
    }
  } catch {
    /* sin URL válida */
  }
  return false;
}

const BOTON_PRINCIPAL =
  "rounded-sm border border-[color:var(--color-eclipse-gold)]/70 px-6 py-3 font-display text-sm tracking-wide text-[color:var(--color-eclipse-gold)] disabled:opacity-40";
const ESTILO_PRINCIPAL = { background: "linear-gradient(180deg, rgba(232,196,104,0.12) 0%, rgba(232,196,104,0.03) 100%)" };

export function OnlineScreen() {
  const irA = useGameStore((s) => s.irA);
  const { sala, conexion, error, nombre, setNombre, crearSala, unirse, salir, salaGuardada, limpiarError } = useOnline();
  const [codigo, setCodigo] = useState(codigoDelEnlace ?? "");

  useEffect(() => {
    audioManager.playMusicaAmbiental("/audio/musica/intro-loop.mp3");
  }, []);

  // Cuando la partida empieza, todos pasan al tablero. Si se vuelve desde la
  // pantalla de victoria, la sala regresa a la selección de razas.
  const fasePartida = sala?.partida?.fase;
  useEffect(() => {
    if (!fasePartida) return;
    if (fasePartida === "fin") useOnline.getState().enviar({ t: "volverASala" });
    else irA("digital");
  }, [fasePartida, irA]);

  const volver = () => {
    audioManager.playSfxBoton();
    if (sala) salir();
    irA("preparacion");
  };

  return (
    <Fondo
      ancho={!!sala}
      esquina={
        <button
          onClick={volver}
          className="absolute left-3 top-3 z-40 flex h-9 items-center gap-1.5 rounded-sm border border-white/15 bg-black/30 px-3 font-display text-[11px] tracking-wide text-[color:var(--color-parchment-dim)] backdrop-blur-sm transition-colors hover:text-[color:var(--color-parchment)] sm:left-5 sm:top-5 sm:h-11 sm:px-4 sm:text-sm"
          aria-label={sala ? "Salir de la sala y volver al menú" : "Volver al menú"}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {sala ? "Salir" : "Menú"}
        </button>
      }
    >
      {sala ? (
        <SalaDeEspera sala={sala} reconectando={conexion === "reconectando"} onSalir={volver} />
      ) : (
        <div className="flex w-full max-w-xs flex-col items-stretch gap-5">
          <div className="text-center">
            <h2 className="font-display text-xl tracking-wide text-[color:var(--color-parchment)]">Jugar en línea</h2>
            <p className="mt-2 text-xs text-[color:var(--color-muted)] sm:text-sm">Crea una sala privada y comparte el código con tus amigos.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Tu nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value.slice(0, 20))}
              placeholder="Cómo te verán los demás"
              maxLength={20}
              className="rounded-sm border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-[color:var(--color-parchment)] outline-none placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-eclipse-gold)]/60"
            />
          </label>

          <motion.button
            onClick={() => {
              audioManager.playSfxBoton();
              void crearSala();
            }}
            disabled={!nombre.trim() || conexion === "conectando"}
            className={BOTON_PRINCIPAL}
            style={ESTILO_PRINCIPAL}
            whileTap={{ scale: 0.95 }}
          >
            {conexion === "conectando" ? "Conectando…" : "Crear sala privada"}
          </motion.button>

          <div className="flex items-center gap-3 text-[11px] text-[color:var(--color-muted)]">
            <span className="h-px flex-1 bg-white/10" />o únete con un código<span className="h-px flex-1 bg-white/10" />
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!codigoValido(codigo) || !nombre.trim()) return;
              audioManager.playSfxBoton();
              unirse(codigo);
            }}
          >
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, LARGO_CODIGO))}
              placeholder="ABCD"
              aria-label="Código de la sala"
              autoCapitalize="characters"
              className="w-0 flex-1 rounded-sm border border-white/15 bg-black/30 px-3 py-2.5 text-center font-display text-lg tracking-[0.4em] text-[color:var(--color-parchment)] outline-none placeholder:text-white/20 focus:border-[color:var(--color-eclipse-gold)]/60"
            />
            <button
              type="submit"
              disabled={!codigoValido(codigo) || !nombre.trim() || conexion === "conectando"}
              className="rounded-sm border border-white/20 px-4 font-display text-sm tracking-wide text-[color:var(--color-parchment)] disabled:opacity-40"
            >
              Unirse
            </button>
          </form>

          {salaGuardada && (
            <button
              onClick={() => {
                audioManager.playSfxBoton();
                unirse(salaGuardada);
              }}
              className="text-xs text-[color:var(--color-eclipse-gold)] underline-offset-4 hover:underline"
            >
              Volver a la sala {salaGuardada}
            </button>
          )}

          {error && (
            <p className="rounded-sm border border-red-400/30 bg-red-950/30 px-3 py-2 text-center text-xs text-red-200" onClick={limpiarError}>
              {error}
            </p>
          )}
          {!nombre.trim() && <p className="text-center text-[11px] text-[color:var(--color-muted)]">Escribe tu nombre para continuar.</p>}

          <button onClick={volver} className="py-2 text-xs text-[color:var(--color-muted)]">
            Volver
          </button>
        </div>
      )}
    </Fondo>
  );
}

function SalaDeEspera({ sala, reconectando, onSalir }: { sala: VistaSala; reconectando: boolean; onSalir: () => void }) {
  const { jugadorId, enviar, error } = useOnline();
  const soyAnfitrion = sala.anfitrion === jugadorId;
  const [copiado, setCopiado] = useState(false);
  const activos = ORDEN_RAZAS.filter((r) => sala.asientos[r].tipo === "humano" || sala.asientos[r].tipo === "ia");
  const puedeEmpezar = activos.length >= 2;

  const enlace = `${window.location.origin}${window.location.pathname}?sala=${sala.codigo}`;
  const compartir = async () => {
    audioManager.playSfxBoton();
    const texto = `¡Únete a mi partida de Immernacht! Código: ${sala.codigo}`;
    try {
      if (navigator.share) await navigator.share({ title: "Immernacht", text: texto, url: enlace });
      else {
        await navigator.clipboard.writeText(enlace);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
      }
    } catch {
      /* el jugador canceló */
    }
  };

  const nombreDe = (id: string) => sala.jugadores.find((j) => j.id === id)?.nombre ?? "Jugador";
  const razaDe = (id: string) =>
    ORDEN_RAZAS.find((r) => {
      const a = sala.asientos[r];
      return a.tipo === "humano" && a.jugadorId === id;
    });
  const listos = sala.listos ?? [];
  const propuestas = sala.propuestas ?? [];
  const recibidas = propuestas.filter((p) => p.a === jugadorId);
  const estoyListo = listos.includes(jugadorId);
  const cuenta = useCuentaRegresiva(sala.cuenta ?? null, sala.cuentaRestante);

  const conectados = sala.jugadores.filter((j) => j.conectado);
  const listosConectados = conectados.filter((j) => listos.includes(j.id)).length;
  const sinRaza = sala.jugadores.filter((j) => !razaDe(j.id));
  const enEspera = cuenta !== null && cuenta > SEGUNDOS_CUENTA;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">Código de la sala</p>
        <p className="mt-1 font-display text-4xl tracking-[0.35em] text-[color:var(--color-eclipse-gold)]" style={{ paddingLeft: "0.35em" }}>
          {sala.codigo}
        </p>
        <button
          onClick={() => void compartir()}
          className="mt-2 rounded-full border border-white/15 px-4 py-1 text-xs text-[color:var(--color-parchment-dim)] hover:text-[color:var(--color-parchment)]"
        >
          {copiado ? "¡Enlace copiado!" : "Compartir invitación"}
        </button>
        <p className="mx-auto mt-2 max-w-xs text-[11px] leading-relaxed text-[color:var(--color-muted)]">
          {!puedeEmpezar
            ? soyAnfitrion
              ? "Se necesitan al menos 2 facciones: espera a otro jugador o pon una máquina."
              : "Se necesitan al menos 2 facciones para empezar."
            : soyAnfitrion
              ? "Los asientos libres no jugarán. Usa «Poner máquina» para llenarlos."
              : null}
        </p>
        {reconectando && <p className="mt-2 text-xs text-amber-300">Reconectando…</p>}
      </div>

      {/* Propuestas de intercambio que me hicieron */}
      {recibidas.map((p) => {
        const suya = razaDe(p.de);
        const mia = razaDe(jugadorId);
        return (
          <div key={p.de} className="w-full max-w-lg rounded-md border border-[color:var(--color-eclipse-gold)]/40 bg-black/40 px-4 py-3 text-center">
            <p className="text-sm text-[color:var(--color-parchment)]">
              <strong>{nombreDe(p.de)}</strong>{" "}
              {suya && mia
                ? `quiere cambiar sus ${RAZAS[suya].nombre} por tus ${RAZAS[mia].nombre}.`
                : mia
                  ? `te pide los ${RAZAS[mia].nombre}.`
                  : "quiere cambiar de raza contigo."}
            </p>
            <div className="mt-2 flex justify-center gap-2">
              <button
                onClick={() => {
                  audioManager.playSfxBoton();
                  enviar({ t: "responderCambio", de: p.de, aceptar: true });
                }}
                className="rounded-sm border border-emerald-400/60 px-4 py-1.5 font-display text-xs tracking-wide text-emerald-200"
              >
                {suya ? "Intercambiar" : "Ceder"}
              </button>
              <button
                onClick={() => {
                  audioManager.playSfxBoton();
                  enviar({ t: "responderCambio", de: p.de, aceptar: false });
                }}
                className="rounded-sm border border-white/20 px-4 py-1.5 font-display text-xs tracking-wide text-[color:var(--color-parchment-dim)]"
              >
                Rechazar
              </button>
            </div>
          </div>
        );
      })}

      {/* Razas a la izquierda; a la derecha, el botón de listo (debajo en pantallas angostas) */}
      <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:items-stretch sm:justify-center">
        <div className="grid w-full max-w-lg grid-cols-2 gap-3">
          {ORDEN_RAZAS.map((r) => {
            const a = sala.asientos[r];
            const ocupante = a.tipo === "humano" ? a.jugadorId : null;
            return (
              <AsientoCard
                key={r}
                raza={r}
                asiento={a}
                mio={ocupante === jugadorId}
                nombre={ocupante ? nombreDe(ocupante) : ""}
                anfitrion={!!ocupante && ocupante === sala.anfitrion}
                conectado={!ocupante || !!sala.jugadores.find((j) => j.id === ocupante)?.conectado}
                listo={!!ocupante && listos.includes(ocupante)}
                soyAnfitrion={soyAnfitrion}
                propuesta={
                  !ocupante || ocupante === jugadorId
                    ? null
                    : propuestas.some((p) => p.de === jugadorId && p.a === ocupante)
                      ? "enviada"
                      : propuestas.some((p) => p.de === ocupante && p.a === jugadorId)
                        ? "recibida"
                        : null
                }
                onElegir={() => enviar({ t: "elegirRaza", raza: r })}
                onCambiar={() => enviar({ t: "cambiarAsiento", raza: r })}
                onProponer={() => enviar({ t: "proponerCambio", raza: r })}
                onCancelar={() => enviar({ t: "cancelarCambio" })}
                onSoltar={() => enviar({ t: "soltarRaza" })}
              />
            );
          })}
        </div>

        <div className="flex w-full max-w-xs flex-col items-stretch justify-center gap-3 sm:w-52">
          <motion.button
            onClick={() => {
              audioManager.playSfxBoton();
              enviar({ t: "listo", valor: !estoyListo });
            }}
            aria-pressed={estoyListo}
            className="rounded-md border-2 px-6 py-4 font-display text-lg tracking-[0.12em] transition-colors"
            style={{
              borderColor: estoyListo ? "#34d399" : "rgba(255,255,255,0.25)",
              color: estoyListo ? "#d1fae5" : "var(--color-parchment-dim)",
              background: estoyListo ? "linear-gradient(180deg, rgba(16,185,129,0.35), rgba(6,78,59,0.35))" : "rgba(0,0,0,0.3)",
              boxShadow: estoyListo ? "0 0 24px rgba(52,211,153,0.45)" : "none",
            }}
            whileTap={{ scale: 0.95 }}
          >
            {estoyListo ? "✓ LISTO" : "NO LISTO"}
          </motion.button>
          <p className="text-center text-sm text-[color:var(--color-parchment-dim)]">
            {listosConectados}/{conectados.length} listos
          </p>
          {enEspera && (
            <p className="text-center text-xs text-emerald-200">
              La partida empieza en <span className="font-display text-base">{cuenta}</span> s
            </p>
          )}
          {soyAnfitrion && (
            <motion.button
              onClick={() => {
                audioManager.playSfxBoton();
                enviar({ t: "empezar" });
              }}
              disabled={!puedeEmpezar}
              className={BOTON_PRINCIPAL}
              style={ESTILO_PRINCIPAL}
              whileTap={{ scale: 0.95 }}
            >
              Abrir el Portal
            </motion.button>
          )}
        </div>
      </div>

      {sinRaza.length > 0 && (
        <p className="text-center text-[11px] text-[color:var(--color-muted)]">
          Sin raza: {sinRaza.map((j) => `${j.nombre}${j.id === sala.anfitrion ? " 👑" : ""}${j.id === jugadorId ? " (tú)" : ""}`).join(", ")}
        </p>
      )}

      <AnimatePresence>
        {cuenta !== null && cuenta > 0 && cuenta <= SEGUNDOS_CUENTA && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-parchment-dim)]">El Portal se abre en</p>
            <motion.span
              key={cuenta}
              className="font-display text-8xl text-[color:var(--color-eclipse-gold)]"
              style={{ textShadow: "0 0 30px rgba(232,196,104,0.7)" }}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: "backOut" }}
            >
              {cuenta}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-center text-xs text-red-200">{error}</p>}

      <button onClick={onSalir} className="py-2 text-xs text-[color:var(--color-muted)]">
        Salir de la sala
      </button>
    </div>
  );
}

/**
 * Segundos que le quedan a la cuenta regresiva del servidor (null sin cuenta).
 * Suena al arrancar una cuenta nueva y luego solo en los últimos 3 segundos.
 */
function useCuentaRegresiva(cuenta: number | null, restante: number | null | undefined): number | null {
  const [seg, setSeg] = useState<{ de: number; s: number } | null>(null);
  const ultimo = useRef<{ de: number; s: number } | null>(null);
  useEffect(() => {
    if (cuenta === null) return;
    // Servidores anteriores no mandan lo que queda: era siempre la cuenta corta.
    const fin = Date.now() + (restante ?? SEGUNDOS_CUENTA * 1000);
    const tick = () => {
      const s = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      setSeg({ de: cuenta, s });
      const prev = ultimo.current;
      if (prev?.de !== cuenta) {
        if (s > SEGUNDOS_CUENTA) audioManager.playSfxTurno();
        else if (s > 0) audioManager.playSfxBoton();
      } else if (s !== prev.s && s >= 1 && s <= SEGUNDOS_CUENTA) audioManager.playSfxBoton();
      ultimo.current = { de: cuenta, s };
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [cuenta, restante]);
  if (cuenta === null) return null;
  return seg?.de === cuenta ? seg.s : null;
}

const ETIQUETA_CAMBIO: Record<"libre" | "ia" | "nadie", string> = { libre: "Poner máquina", ia: "Cerrar asiento", nadie: "Abrir asiento" };

const ENLACE_ASIENTO = "text-[10px] text-[color:var(--color-eclipse-gold)] underline-offset-2 hover:underline";

function AsientoCard({
  raza,
  asiento,
  mio,
  nombre,
  anfitrion,
  conectado,
  listo,
  soyAnfitrion,
  propuesta,
  onElegir,
  onCambiar,
  onProponer,
  onCancelar,
  onSoltar,
}: {
  raza: RazaId;
  asiento: Asiento;
  mio: boolean;
  nombre: string;
  /** Quien ocupa el asiento es el dueño de la sala. */
  anfitrion: boolean;
  conectado: boolean;
  listo: boolean;
  soyAnfitrion: boolean;
  /** Intercambio con quien ocupa este asiento: el que yo le propuse o el que me propuso. */
  propuesta: "enviada" | "recibida" | null;
  onElegir: () => void;
  onCambiar: () => void;
  onProponer: () => void;
  onCancelar: () => void;
  onSoltar: () => void;
}) {
  const conSonido = (fn: () => void) => () => {
    audioManager.playSfxBoton();
    fn();
  };
  const color = COLOR_TABLERO[raza].base;
  const cerrado = asiento.tipo === "nadie";
  const elegible = !mio && (asiento.tipo === "libre" || asiento.tipo === "ia");
  const etiqueta =
    asiento.tipo === "humano" ? `${anfitrion ? "👑" : "👤"} ${nombre}${mio ? " (tú)" : ""}${conectado ? "" : " · sin conexión"}` :asiento.tipo === "ia" ? "🤖 Máquina" : asiento.tipo === "libre" ? "Libre" : "No juega";

  return (
    <div
      className="relative flex flex-col items-center gap-2 rounded-md border px-3 py-4 transition-[box-shadow,background] duration-300"
      style={{
        borderColor: cerrado ? "rgba(255,255,255,0.1)" : mio || listo ? COLOR_TABLERO[raza].claro : `color-mix(in srgb, ${color} 55%, transparent)`,
        background: cerrado
          ? "rgba(255,255,255,0.02)"
          : `linear-gradient(180deg, color-mix(in srgb, ${color} ${listo ? 42 : mio ? 30 : 16}%, transparent), rgba(5,7,15,0.4))`,
        boxShadow: listo ? `0 0 22px color-mix(in srgb, ${color} 70%, transparent), inset 0 0 18px color-mix(in srgb, ${color} 30%, transparent)` : "none",
        opacity: cerrado ? 0.5 : 1,
      }}
    >
      {listo && (
        <motion.span
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: "#10b981", boxShadow: "0 0 10px rgba(16,185,129,0.8)" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          aria-label="Listo"
        >
          ✓
        </motion.span>
      )}
      <button
        onClick={() => {
          if (!elegible) return;
          audioManager.playSfxBoton();
          onElegir();
        }}
        disabled={!elegible}
        className="flex flex-col items-center gap-2 disabled:cursor-default"
        aria-label={elegible ? `Jugar con ${RAZAS[raza].nombre}` : RAZAS[raza].nombre}
      >
        <img src={RAZAS[raza].logo} alt="" className="h-12 w-12 object-contain" />
        <span className="font-display text-sm tracking-wide" style={{ color }}>
          {RAZAS[raza].nombre}
        </span>
      </button>
      <span className="max-w-full truncate rounded-full border border-white/15 px-3 py-0.5 text-[11px] text-[color:var(--color-parchment-dim)]">{etiqueta}</span>
      {elegible && <span className="text-[10px] text-[color:var(--color-muted)]">Toca para elegir</span>}
      {soyAnfitrion && asiento.tipo !== "humano" && (
        <button onClick={conSonido(onCambiar)} className={ENLACE_ASIENTO}>
          {ETIQUETA_CAMBIO[asiento.tipo]}
        </button>
      )}
      {mio && (
        <button onClick={conSonido(onSoltar)} className={ENLACE_ASIENTO}>
          Dejar libre
        </button>
      )}
      {asiento.tipo === "humano" && !mio && propuesta === null && (
        <button onClick={conSonido(onProponer)} className={ENLACE_ASIENTO}>
          Proponer intercambio
        </button>
      )}
      {propuesta === "enviada" && (
        <span className="text-center text-[10px] text-[color:var(--color-muted)]">
          Esperando respuesta ·{" "}
          <button onClick={conSonido(onCancelar)} className={ENLACE_ASIENTO}>
            Cancelar
          </button>
        </span>
      )}
      {propuesta === "recibida" && <span className="text-[10px] text-emerald-300">Te propone un intercambio</span>}
    </div>
  );
}

function Fondo({ children, esquina, ancho = false }: { children: ReactNode; esquina?: ReactNode; ancho?: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-noise" style={{ background: "var(--color-void-deep)" }}>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(130% 90% at 50% 20%, #241a3c 0%, var(--color-void) 55%, var(--color-void-deep) 100%)" }}
      />
      <StarField count={40} />
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 140px 40px rgba(0,0,0,0.75)" }} />
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-none">
        <div className={`relative mx-auto flex min-h-full w-full ${ancho ? "max-w-3xl" : "max-w-lg"} flex-col items-center justify-center px-5 pb-10 pt-16`}>{children}</div>
      </div>
      {esquina}
    </div>
  );
}
